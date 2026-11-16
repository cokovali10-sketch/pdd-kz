//! JolBilet content CLI.
//!
//! Commands:
//!   pdd-cli validate <content-dir>            validate content, exit 1 on errors
//!   pdd-cli stats    <content-dir>            print a JSON summary
//!   pdd-cli tickets  <content-dir> [--out f]  build exam tickets deterministically
//!
//! Ticket building must match `apps/web/src/lib/selection.ts` exactly, so the
//! same question ends up in the same ticket regardless of which tool generated it.

use pdd_core::{content_version, Question};
use serde::Serialize;
use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug)]
enum CliError {
    Usage(String),
    Io(std::io::Error),
    Json(serde_json::Error),
    Validation(Vec<String>),
}

impl std::fmt::Display for CliError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            CliError::Usage(message) => write!(f, "usage error: {message}"),
            CliError::Io(error) => write!(f, "io error: {error}"),
            CliError::Json(error) => write!(f, "json error: {error}"),
            CliError::Validation(errors) => {
                writeln!(f, "content validation failed with {} error(s):", errors.len())?;
                for error in errors {
                    writeln!(f, "  - {error}")?;
                }
                Ok(())
            }
        }
    }
}

impl From<std::io::Error> for CliError {
    fn from(error: std::io::Error) -> Self {
        CliError::Io(error)
    }
}

impl From<serde_json::Error> for CliError {
    fn from(error: serde_json::Error) -> Self {
        CliError::Json(error)
    }
}

type Result<T> = std::result::Result<T, CliError>;

fn read_json<T: serde::de::DeserializeOwned>(path: &Path) -> Result<T> {
    let raw = fs::read_to_string(path)?;
    Ok(serde_json::from_str(&raw)?)
}

fn read_questions(content: &Path) -> Result<Vec<Question>> {
    let dir = content.join("questions");
    let mut entries: Vec<PathBuf> = Vec::new();
    for entry in fs::read_dir(&dir)? {
        let path = entry?.path();
        if path.extension().and_then(|value| value.to_str()) == Some("json") {
            entries.push(path);
        }
    }
    entries.sort();

    let mut questions = Vec::new();
    for path in entries {
        let file: Vec<Question> = read_json(&path)?;
        questions.extend(file);
    }
    Ok(questions)
}

fn index(keys: impl IntoIterator<Item = String>) -> BTreeMap<String, ()> {
    keys.into_iter().map(|key| (key, ())).collect()
}

#[derive(Debug, Serialize)]
struct Stats {
    version: String,
    questions: usize,
    topics: usize,
    signs: usize,
    markings: usize,
    pdd_points: usize,
    fines: usize,
    with_diagram: usize,
    with_signs: usize,
    questions_per_topic: BTreeMap<String, usize>,
}

fn build_stats(content: &Path, questions: &[Question]) -> Result<Stats> {
    let topics: Vec<serde_json::Value> = read_json(&content.join("topics.json"))?;
    let signs: Vec<serde_json::Value> = read_json(&content.join("signs.json"))?;
    let markings: Vec<serde_json::Value> = read_json(&content.join("markings.json"))?;
    let chapters: Vec<serde_json::Value> = read_json(&content.join("pdd/chapters.json"))?;
    let fines: Vec<serde_json::Value> = read_json(&content.join("fines.json"))?;

    let pdd_points: usize = chapters
        .iter()
        .map(|chapter| {
            chapter
                .get("points")
                .and_then(|points| points.as_array())
                .map(|points| points.len())
                .unwrap_or(0)
        })
        .sum();

    let mut per_topic: BTreeMap<String, usize> = BTreeMap::new();
    for question in questions {
        for topic in &question.topic_ids {
            *per_topic.entry(topic.clone()).or_default() += 1;
        }
    }

    let raw = fs::read(content.join("questions").join("01-basics.json")).unwrap_or_default();
    let version = content_version(&raw);

    Ok(Stats {
        version,
        questions: questions.len(),
        topics: topics.len(),
        signs: signs.len(),
        markings: markings.len(),
        pdd_points,
        fines: fines.len(),
        with_diagram: questions.iter().filter(|q| q.diagram.is_some()).count(),
        with_signs: questions.iter().filter(|q| !q.sign_ids.is_empty()).count(),
        questions_per_topic: per_topic,
    })
}

// ---------------------------------------------------------------- randomness

/// 32-bit FNV-1a, identical to `hashString` in `apps/web/src/lib/utils.ts`.
fn hash_string(input: &str) -> u32 {
    let mut hash: u32 = 2_166_136_261;
    for byte in input.bytes() {
        hash ^= u32::from(byte);
        hash = hash.wrapping_mul(16_777_619);
    }
    hash
}

/// mulberry32, identical to the TypeScript implementation.
struct Mulberry32 {
    state: u32,
}

impl Mulberry32 {
    fn new(seed: u32) -> Self {
        Self { state: seed }
    }

    fn next_f64(&mut self) -> f64 {
        self.state = self.state.wrapping_add(0x6D2B79F5);
        let mut t = self.state;
        t = (t ^ (t >> 15)).wrapping_mul(t | 1);
        t ^= t.wrapping_add((t ^ (t >> 7)).wrapping_mul(t | 61));
        let value = (t ^ (t >> 14)) as f64;
        value / 4_294_967_296.0
    }
}

/// Fisher-Yates in the same direction as `shuffleWithSeed` in TypeScript.
fn shuffle_with_seed<T: Clone>(items: &[T], seed: u32) -> Vec<T> {
    let mut rng = Mulberry32::new(seed);
    let mut out: Vec<T> = items.to_vec();
    if out.is_empty() {
        return out;
    }
    let mut i = out.len() - 1;
    while i > 0 {
        let j = (rng.next_f64() * ((i + 1) as f64)) as usize;
        out.swap(i, j.min(i));
        i -= 1;
    }
    out
}

#[derive(Debug, Serialize)]
struct Ticket {
    id: String,
    number: usize,
    #[serde(rename = "questionIds")]
    question_ids: Vec<String>,
}

fn build_tickets(questions: &[Question], size: usize, count: usize) -> Vec<Ticket> {
    let ordered = shuffle_with_seed(questions, hash_string("tickets-v1"));
    let mut tickets = Vec::new();
    for index in 0..count {
        let start = index * size;
        if start >= ordered.len() {
            break;
        }
        let end = (start + size).min(ordered.len());
        let slice = &ordered[start..end];
        tickets.push(Ticket {
            id: format!("b_{:02}", index + 1),
            number: index + 1,
            question_ids: slice.iter().map(|q| q.id.clone()).collect(),
        });
    }
    tickets
}

// ------------------------------------------------------------------ commands

fn cmd_validate(content: &Path) -> Result<()> {
    let questions = read_questions(content)?;
    let topics: Vec<serde_json::Value> = read_json(&content.join("topics.json"))?;
    let signs: Vec<serde_json::Value> = read_json(&content.join("signs.json"))?;

    let topic_index = index(topics.iter().filter_map(|t| t.get("id").and_then(|v| v.as_str()).map(String::from)));
    let sign_index = index(signs.iter().map(|s| format!("s_{}", s.get("code").and_then(|v| v.as_str()).unwrap_or_default())));

    let mut errors = Vec::new();
    let mut seen = BTreeSet::new();
    let mut fingerprints = BTreeSet::new();

    for question in &questions {
        if !seen.insert(question.id.clone()) {
            errors.push(format!("question \"{}\": duplicate id", question.id));
        }
        if !fingerprints.insert(question.fingerprint()) {
            errors.push(format!(
                "question \"{}\": duplicate content (same text and options as another question)",
                question.id
            ));
        }
        errors.extend(question.validate(&topic_index, &sign_index));
    }

    if questions.is_empty() {
        errors.push("questions: the pool is empty".to_string());
    }

    if errors.is_empty() {
        println!(
            "ok: {} questions, {} topics, {} signs",
            questions.len(),
            topic_index.len(),
            sign_index.len()
        );
        return Ok(());
    }
    Err(CliError::Validation(errors))
}

fn cmd_stats(content: &Path) -> Result<()> {
    let questions = read_questions(content)?;
    let stats = build_stats(content, &questions)?;
    println!("{}", serde_json::to_string_pretty(&stats)?);
    Ok(())
}

fn cmd_tickets(content: &Path, size: usize, count: usize, out: Option<&Path>) -> Result<()> {
    let questions = read_questions(content)?;
    let tickets = build_tickets(&questions, size, count);
    let json = serde_json::to_string_pretty(&tickets)?;
    match out {
        Some(path) => {
            fs::write(path, format!("{json}\n"))?;
            println!("wrote {} ticket(s) to {}", tickets.len(), path.display());
        }
        None => println!("{json}"),
    }
    Ok(())
}

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let result = run(&args);
    if let Err(error) = result {
        eprintln!("{error}");
        std::process::exit(1);
    }
}

fn run(args: &[String]) -> Result<()> {
    let command = args.first().map(String::as_str).unwrap_or("");
    let content = PathBuf::from(args.get(1).cloned().unwrap_or_else(|| "content".to_string()));

    match command {
        "validate" => cmd_validate(&content),
        "stats" => cmd_stats(&content),
        "tickets" => {
            let mut size = 20usize;
            let mut count = 2usize;
            let mut out: Option<PathBuf> = None;
            let mut index = 2;
            while index < args.len() {
                match args[index].as_str() {
                    "--size" => {
                        size = args
                            .get(index + 1)
                            .and_then(|value| value.parse().ok())
                            .ok_or_else(|| CliError::Usage("--size expects a number".into()))?;
                        index += 2;
                    }
                    "--count" => {
                        count = args
                            .get(index + 1)
                            .and_then(|value| value.parse().ok())
                            .ok_or_else(|| CliError::Usage("--count expects a number".into()))?;
                        index += 2;
                    }
                    "--out" => {
                        out = args.get(index + 1).map(PathBuf::from);
                        index += 2;
                    }
                    other => {
                        return Err(CliError::Usage(format!("unknown argument \"{other}\"")));
                    }
                }
            }
            cmd_tickets(&content, size, count, out.as_deref())
        }
        "" | "--help" | "-h" | "help" => {
            println!(
                "pdd-cli\n\n  validate <content-dir>\n  stats    <content-dir>\n  tickets  <content-dir> [--size N] [--count N] [--out FILE]"
            );
            Ok(())
        }
        other => Err(CliError::Usage(format!("unknown command \"{other}\""))),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use pdd_core::fnv1a_hex;

    #[test]
    fn hash_string_matches_the_typescript_implementation() {
        assert_eq!(hash_string("abc"), 0x1a47e90b);
        assert_eq!(hash_string(""), 0x811c9dc5);
    }

    #[test]
    fn mulberry32_matches_the_typescript_implementation() {
        let mut rng = Mulberry32::new(42);
        let first = rng.next_f64();
        assert!((first - 0.6011037519201636).abs() < 1e-12, "got {first}");
    }

    #[test]
    fn shuffling_is_deterministic_and_keeps_every_item() {
        let items: Vec<u32> = (0..30).collect();
        let a = shuffle_with_seed(&items, 42);
        let b = shuffle_with_seed(&items, 42);
        assert_eq!(a, b);
        assert_ne!(a, items);
        let mut sorted = a.clone();
        sorted.sort_unstable();
        assert_eq!(sorted, items);
    }

    #[test]
    fn fnv_hex_is_stable() {
        assert_eq!(fnv1a_hex(b"abc").len(), 16);
        assert_eq!(fnv1a_hex(b"abc"), fnv1a_hex(b"abc"));
    }
}