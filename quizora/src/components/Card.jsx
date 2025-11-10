export default function Card({ children, interactive = false, className = '', ...props }) {
  const base = `card ${interactive ? 'card-interactive' : ''}`
  return (
    <div className={`${base} ${className}`} {...props}>
      {children}
    </div>
  )
}
