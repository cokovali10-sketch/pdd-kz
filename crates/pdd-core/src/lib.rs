//! Canonical content model for the JolBilet PDD trainer.
//!
//! The structs here mirror `content/*.json` and the TypeScript types in
//! `apps/web/src/lib/types.ts`. Keeping the model in Rust means the CLI can
//! validate the exact same files the web app ships, and any drift between the
//! two definitions is caught at build time instead of in production.

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

/// Supported content languages.
pub const LOCALES: [&str; 3] = ["ru", "kk", "en"];

/// A trilingual string. Every content string must carry all three locales so the
/// UI never falls back to an empty label.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Localized {
    pub ru: String,
    pub kk: String,
    pub en: String,
}

impl Localized {
    pub fn is_complete(&self) -> bool {
        !self.ru.trim().is_empty() && !self.kk.trim().is_empty() && !self.en.trim().is_empty()
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PddRef {
    pub chapter: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub point: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuestionOption {
    pub id: String,
    pub text: Localized,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Question {
    pub id: String,
    pub category: String,
    pub topic_ids: Vec<String>,
    pub text: Localized,
    pub options: Vec<QuestionOption>,
    pub correct_option_id: String,
    pub explanation: Localized,
    #[serde(default)]
    pub pd_d_refs: Vec<PddRef>,
    #[serde(default)]
    pub sign_ids: Vec<String>,
    #[serde(default)]
    pub diagram: Option<serde_json::Value>,
    #[serde(default = "default_difficulty")]
    pub difficulty: u8,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub source: String,
}

fn default_difficulty() -> u8 {
    1
}

impl Question {
    /// Collects everything that would break the UI or the content pipeline.
    pub fn validate(&self, known_topics: &BTreeMap<String, ()>, known_signs: &BTreeMap<String, ()>) -> Vec<String> {
        let mut errors = Vec::new();

        if !self.text.is_complete() {
            errors.push(format!("{}: text must be complete in ru/kk/en", self.id));
        }
        if !self.explanation.is_complete() {
            errors.push(format!("{}: explanation must be complete in ru/kk/en", self.id));
        }
        if self.options.len() < 2 {
            errors.push(format!("{}: at least two options are required", self.id));
        }
        let mut ids = BTreeMap::new();
        for option in &self.options {
            if !option.text.is_complete() {
                errors.push(format!("{}: option {} is missing a translation", self.id, option.id));
            }
            ids.insert(option.id.clone(), ());
        }
        if !ids.contains_key(&self.correct_option_id) {
            errors.push(format!(
                "{}: correctOptionId \"{}\" is not among the options",
                self.id, self.correct_option_id
            ));
        }
        if self.topic_ids.is_empty() {
            errors.push(format!("{}: at least one topic is required", self.id));
        }
        for topic in &self.topic_ids {
            if !known_topics.contains_key(topic) {
                errors.push(format!("{}: unknown topic \"{}\"", self.id, topic));
            }
        }
        if self.pd_d_refs.is_empty() {
            errors.push(format!("{}: at least one pdDRef is required", self.id));
        }
        for reference in &self.pd_d_refs {
            if reference.chapter.trim().is_empty() {
                errors.push(format!("{}: pdDRef without chapter", self.id));
            }
        }
        for sign in &self.sign_ids {
            if !known_signs.contains_key(sign) {
                errors.push(format!("{}: unknown signId \"{}\"", self.id, sign));
            }
        }
        if !(1..=3).contains(&self.difficulty) {
            errors.push(format!("{}: difficulty must be 1..=3", self.id));
        }
        errors
    }

    /// Stable 64-bit FNV-1a fingerprint used to de-duplicate questions that come
    /// from different importers.
    pub fn fingerprint(&self) -> String {
        let payload = format!(
            "{}|{}|{}",
            self.text.ru,
            self.options
                .iter()
                .map(|option| option.text.ru.as_str())
                .collect::<Vec<_>>()
                .join("¦"),
            self.correct_option_id
        );
        fnv1a_hex(payload.as_bytes())
    }
}

pub fn fnv1a_hex(bytes: &[u8]) -> String {
    let mut hash: u64 = 0xcbf29ce484222325;
    for byte in bytes {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(0x100000001b3);
    }
    format!("{hash:016x}")
}

/// Short content version derived from the whole document, used for cache busting.
pub fn content_version(bytes: &[u8]) -> String {
    fnv1a_hex(bytes)[..12].to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn localized(value: &str) -> Localized {
        Localized {
            ru: value.to_string(),
            kk: value.to_string(),
            en: value.to_string(),
        }
    }

    fn sample_question() -> Question {
        Question {
            id: "q_1".into(),
            category: "B".into(),
            topic_ids: vec!["common".into()],
            text: localized("Text"),
            options: vec![
                QuestionOption {
                    id: "a".into(),
                    text: localized("A"),
                },
                QuestionOption {
                    id: "b".into(),
                    text: localized("B"),
                },
            ],
            correct_option_id: "b".into(),
            explanation: localized("Because"),
            pd_d_refs: vec![PddRef {
                chapter: "1".into(),
                point: Some("1.2".into()),
            }],
            sign_ids: vec![],
            diagram: None,
            difficulty: 1,
            tags: vec![],
            source: "test".into(),
        }
    }

    fn index(keys: &[&str]) -> BTreeMap<String, ()> {
        keys.iter().map(|key| ((*key).to_string(), ())).collect()
    }

    #[test]
    fn accepts_a_well_formed_question() {
        let question = sample_question();
        let errors = question.validate(&index(&["common"]), &index(&[]));
        assert!(errors.is_empty(), "unexpected errors: {errors:?}");
    }

    #[test]
    fn rejects_unknown_topics_and_signs() {
        let mut question = sample_question();
        question.topic_ids = vec!["nope".into()];
        question.sign_ids = vec!["s_1.22".into()];
        let errors = question.validate(&index(&["common"]), &index(&["s_1.22"]));
        assert_eq!(errors.len(), 1, "expected only the unknown topic error: {errors:?}");
        assert!(errors[0].contains("unknown topic"));
    }

    #[test]
    fn rejects_a_correct_option_outside_the_options() {
        let mut question = sample_question();
        question.correct_option_id = "z".into();
        let errors = question.validate(&index(&["common"]), &index(&[]));
        assert!(errors.iter().any(|error| error.contains("correctOptionId")));
    }

    #[test]
    fn fingerprint_is_stable_and_order_sensitive() {
        let mut question = sample_question();
        let first = question.fingerprint();
        assert_eq!(first, question.fingerprint());

        question.options.reverse();
        let second = question.fingerprint();
        assert_ne!(first, second);
    }

    #[test]
    fn content_version_is_twelve_characters() {
        let version = content_version(b"{\"a\":1}");
        assert_eq!(version.len(), 12);
    }
}