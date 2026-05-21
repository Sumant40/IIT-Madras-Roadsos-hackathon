export default function GuidancePanel({ steps, title = 'While you wait' }) {
  if (!steps?.length) return null

  return (
    <div className="guidance-panel" aria-label={title}>
      <h2>{title}</h2>
      <ol>
        {steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
    </div>
  )
}
