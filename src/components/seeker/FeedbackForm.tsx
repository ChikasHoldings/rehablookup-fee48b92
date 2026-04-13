import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeedbackFormProps {
  onSubmit: (rating: number, feedback: string) => void;
  isSubmitting: boolean;
}

export function FeedbackForm({ onSubmit, isSubmitting }: FeedbackFormProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedback, setFeedback] = useState("");

  const MAX_FEEDBACK_LENGTH = 2000;

  const handleSubmit = () => {
    if (rating === 0 || rating < 1 || rating > 5) return;
    // Sanitize feedback text
    const sanitized = feedback
      .replace(/<[^>]*>/g, '')
      .replace(/javascript:/gi, '')
      .trim()
      .slice(0, MAX_FEEDBACK_LENGTH);
    onSubmit(rating, sanitized);
  };

  return (
    <div className="space-y-6">
      {/* Star Rating */}
      <div className="space-y-2">
        <Label>Rate your experience</Label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="p-1 transition-transform hover:scale-110"
              aria-label={`Rate ${star} stars`}
            >
              <Star
                className={cn(
                  "h-8 w-8 transition-colors",
                  (hoveredRating || rating) >= star
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground"
                )}
              />
            </button>
          ))}
        </div>
        {rating > 0 && (
          <p className="text-sm text-muted-foreground">
            {rating === 1 && "Poor"}
            {rating === 2 && "Fair"}
            {rating === 3 && "Good"}
            {rating === 4 && "Very Good"}
            {rating === 5 && "Excellent"}
          </p>
        )}
      </div>

      {/* Feedback Text */}
      <div className="space-y-2">
        <Label htmlFor="feedback">Tell us more (optional)</Label>
        <Textarea
          id="feedback"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value.slice(0, MAX_FEEDBACK_LENGTH))}
          placeholder="How was your experience with our concierge service? Any suggestions for improvement?"
          rows={4}
          maxLength={MAX_FEEDBACK_LENGTH}
        />
        <p className="text-xs text-muted-foreground text-right">{feedback.length}/{MAX_FEEDBACK_LENGTH}</p>
      </div>

      {/* Submit Button */}
      <Button 
        onClick={handleSubmit} 
        disabled={rating === 0 || isSubmitting}
        className="w-full sm:w-auto"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting...
          </>
        ) : (
          "Submit Feedback"
        )}
      </Button>
    </div>
  );
}
