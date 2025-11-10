export default function Button({ children, variant = 'primary', className = '', ...props }) {
  const base = variant === 'ghost' ? 'btn-ghost' : variant === 'outline' ? 'btn-outline' : 'btn-primary'
  return (
    <button className={`${base} ${className}`} {...props}>
      {children}
    </button>
  )
}
