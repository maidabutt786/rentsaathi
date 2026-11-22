import { useEffect, useState } from "react";
import { MessageSquare, Star } from "lucide-react";

import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { addReview, fetchReviews } from "../../lib/listingsApi.js";
import { formatDate } from "../../lib/format.js";
import { StarInput, StarRating } from "../ui/StarRating.jsx";
import Button from "../ui/Button.jsx";
import { Textarea } from "../ui/Field.jsx";
import Avatar from "../ui/Avatar.jsx";

export default function ReviewSection({ listingId }) {
  const { user, profile } = useAuth();
  const { push } = useToast();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchReviews(listingId)
      .then((items) => {
        if (!cancelled) setReviews(items);
      })
      .catch(() => {
        if (!cancelled) setReviews([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [listingId]);

  const average = reviews.length
    ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length
    : 0;

  const submit = async (event) => {
    event.preventDefault();
    if (rating === 0) {
      setError("Choose a star rating first.");
      return;
    }
    if (text.trim().length < 10) {
      setError("Write at least 10 characters so other students can learn from your experience.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const review = await addReview({
        listingId,
        studentId: user.uid,
        studentName: profile?.name || user.displayName || "Student",
        rating,
        text,
      });
      setReviews((current) => [review, ...current]);
      setRating(0);
      setText("");
      push("Thanks — your review is published.", "success");
    } catch (err) {
      push(err.message || "Could not save your review.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card p-5" aria-labelledby="reviews-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="reviews-heading" className="flex items-center gap-2 font-heading text-lg font-semibold">
          <MessageSquare className="h-5 w-5 text-primary" aria-hidden="true" />
          Student reviews
        </h2>
        {reviews.length ? (
          <span className="inline-flex items-center gap-2 text-sm text-muted">
            <StarRating value={average} size="sm" />
            <span>
              {average.toFixed(1)} · {reviews.length} review{reviews.length === 1 ? "" : "s"}
            </span>
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="mt-4 space-y-3">
          <div className="skeleton h-20 w-full" />
          <div className="skeleton h-20 w-full" />
        </div>
      ) : reviews.length === 0 ? (
        <p className="mt-4 rounded-xl bg-subtle p-4 text-sm text-muted">
          No reviews yet. If you have visited this room, your honest review helps the next student.
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {reviews.map((review) => (
            <li key={review.id} className="rounded-xl border border-line p-4">
              <div className="flex items-start gap-3">
                <Avatar name={review.studentName} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{review.studentName || "Student"}</p>
                    <span className="text-xs text-muted">{formatDate(review.createdAt)}</span>
                  </div>
                  <StarRating value={review.rating} size="sm" className="mt-1" />
                  <p className="mt-2 text-sm text-muted">{review.text}</p>
                  <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-subtle px-2 py-0.5 text-[11px] text-muted">
                    <Star className="h-3 w-3" aria-hidden="true" />
                    Review authenticity check arrives with the NLP module (Part 4).
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {profile?.role === "student" ? (
        <form onSubmit={submit} className="mt-5 border-t border-line pt-5">
          <h3 className="text-sm font-semibold">Write a review</h3>
          <p className="mt-1 text-xs text-muted">Only review rooms you have actually visited.</p>
          <div className="mt-3">
            <StarInput value={rating} onChange={setRating} />
          </div>
          <Textarea
            className="mt-3"
            label="Your experience"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="What was accurate? What should other students know before visiting?"
            error={error}
            maxLength={800}
          />
          <Button type="submit" size="sm" className="mt-3" loading={saving}>
            Publish review
          </Button>
        </form>
      ) : !user ? (
        <p className="mt-5 border-t border-line pt-4 text-sm text-muted">
          <a href="/login" className="font-semibold text-primary hover:underline">
            Log in as a student
          </a>{" "}
          to write a review.
        </p>
      ) : null}
    </section>
  );
}
