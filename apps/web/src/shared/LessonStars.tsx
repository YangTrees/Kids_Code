import "../styles/lesson-stars.css";
/** Three visible award slots; the accessible label retains the numeric score. */
export function LessonStars({ stars }: { stars: number }) {
  return (
    <span
      className="lesson-stars"
      role="img"
      aria-label={`${stars} 星，满分 3 星`}
    >
      {[1, 2, 3].map((value) => (
        <svg
          key={value}
          viewBox="0 0 24 24"
          data-earned={value <= stars}
          aria-hidden="true"
        >
          <path d="m12 2.8 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3L2.9 9.4l6.3-.9Z" />
        </svg>
      ))}
    </span>
  );
}
