//! Spaced repetition for exam questions (SM-2 inspired).
//!
//! This crate is the single source of truth for the review schedule. The web app
//! ships a TypeScript port in `apps/web/src/lib/srs.ts`; the two are covered by
//! equivalent tests so a question is always rescheduled the same way regardless
//! of which side computes it.

use serde::{Deserialize, Serialize};

pub const DAY_MS: i64 = 86_400_000;
pub const TEN_MINUTES_MS: i64 = 600_000;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SrsState {
    pub question_id: String,
    /// Ease factor between 1.3 (hard) and 2.8 (easy).
    pub ease: f64,
    /// Current interval in whole days.
    pub interval_days: u32,
    /// Epoch milliseconds of the next review.
    pub due_at: i64,
    pub lapses: u32,
    pub streak: u32,
    pub last_reviewed_at: i64,
    /// Rolling accuracy in `0.0..=1.0`.
    pub accuracy: f64,
}

impl Default for SrsState {
    fn default() -> Self {
        Self {
            question_id: String::new(),
            ease: 2.3,
            interval_days: 0,
            due_at: 0,
            lapses: 0,
            streak: 0,
            last_reviewed_at: 0,
            accuracy: 0.5,
        }
    }
}

impl SrsState {
    pub fn new(question_id: impl Into<String>, now: i64) -> Self {
        Self {
            question_id: question_id.into(),
            due_at: now,
            ..SrsState::default()
        }
    }

    pub fn is_due(&self, now: i64) -> bool {
        self.due_at <= now
    }

    pub fn is_weak(&self) -> bool {
        self.accuracy < 0.75 || self.lapses > 0
    }
}

fn clamp(value: f64, min: f64, max: f64) -> f64 {
    value.max(min).min(max)
}

/// Applies one review result to a question's schedule.
pub fn review(previous: Option<&SrsState>, question_id: &str, correct: bool, now: i64) -> SrsState {
    let mut state = previous.cloned().unwrap_or_else(|| SrsState::new(question_id, now));
    state.question_id = question_id.to_string();

    let attempts = state.streak + state.lapses + 1;
    state.accuracy = clamp(
        (state.accuracy * f64::from(attempts - 1) + if correct { 1.0 } else { 0.0 }) / f64::from(attempts),
        0.0,
        1.0,
    );

    if correct {
        state.streak += 1;
        state.ease = clamp(state.ease + 0.06, 1.3, 2.8);
        let base = if state.streak <= 1 {
            1.0
        } else if state.streak == 2 {
            3.0
        } else {
            f64::from(state.interval_days) * state.ease
        };
        state.interval_days = base.round().clamp(1.0, 180.0) as u32;
        state.due_at = now + i64::from(state.interval_days) * DAY_MS;
    } else {
        state.lapses += 1;
        state.streak = 0;
        state.ease = clamp(state.ease - 0.22, 1.3, 2.8);
        state.interval_days = 0;
        // Retry inside the same session.
        state.due_at = now + TEN_MINUTES_MS;
    }

    state.last_reviewed_at = now;
    state
}

/// Orders questions so the weakest come first: lowest accuracy, then most
/// lapses, then the earliest due date.
pub fn by_weakness(a: &SrsState, b: &SrsState) -> std::cmp::Ordering {
    a.accuracy
        .partial_cmp(&b.accuracy)
        .unwrap_or(std::cmp::Ordering::Equal)
        .then(b.lapses.cmp(&a.lapses))
        .then(a.due_at.cmp(&b.due_at))
}

/// Picks the `limit` questions that need attention most, ignoring healthy ones.
pub fn weak_questions(states: &[SrsState], now: i64, limit: usize) -> Vec<&SrsState> {
    let mut weak: Vec<&SrsState> = states
        .iter()
        .filter(|state| state.is_weak() || state.is_due(now))
        .collect();
    weak.sort_by(|a, b| by_weakness(a, b));
    weak.into_iter().take(limit).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    const NOW: i64 = 1_700_000_000_000;

    #[test]
    fn new_state_is_due_immediately() {
        let state = SrsState::new("q1", NOW);
        assert_eq!(state.due_at, NOW);
        assert!(state.is_due(NOW));
        assert_eq!(state.ease, 2.3);
    }

    #[test]
    fn correct_reviews_push_the_question_out() {
        let first = review(None, "q1", true, NOW);
        assert_eq!(first.streak, 1);
        assert_eq!(first.interval_days, 1);
        assert_eq!(first.due_at, NOW + DAY_MS);

        let second = review(Some(&first), "q1", true, NOW + DAY_MS);
        assert_eq!(second.interval_days, 3);
        assert!(!second.is_due(NOW + DAY_MS));
    }

    #[test]
    fn wrong_reviews_come_back_quickly() {
        let state = review(None, "q1", true, NOW);
        let state = review(Some(&state), "q1", true, NOW + DAY_MS);
        let failed = review(Some(&state), "q1", false, NOW + 2 * DAY_MS);
        assert_eq!(failed.streak, 0);
        assert_eq!(failed.interval_days, 0);
        assert_eq!(failed.lapses, 1);
        assert_eq!(failed.due_at, NOW + 2 * DAY_MS + TEN_MINUTES_MS);
        assert!(failed.is_weak());
        assert!(failed.ease < state.ease);
    }

    #[test]
    fn ease_stays_within_bounds() {
        let mut state = SrsState::new("q1", NOW);
        for step in 0..50 {
            state = review(Some(&state), "q1", true, NOW + step);
        }
        assert!((state.ease - 2.8).abs() < f64::EPSILON);

        for step in 0..50 {
            state = review(Some(&state), "q1", false, NOW + 100 + step);
        }
        assert!((state.ease - 1.3).abs() < 1e-9);
    }

    #[test]
    fn weak_questions_are_ordered_first() {
        let good = review(None, "good", true, NOW);
        let bad = review(None, "bad", false, NOW);
        let states = [good.clone(), bad.clone()];
        let ordered = weak_questions(&states, NOW, 5);
        // A correct answer makes the question healthy and not yet due.
        assert_eq!(ordered.len(), 1);
        assert_eq!(ordered[0].question_id, "bad");
        assert_eq!(by_weakness(&good, &bad), std::cmp::Ordering::Greater);
    }
}