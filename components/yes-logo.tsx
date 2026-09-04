import styles from './yes-logo.module.css'

interface YesLogoProps {
  className?: string
}

export function YesLogo({ className }: YesLogoProps) {
  return (
    <span
      className={`${styles.logo}${className ? ` ${className}` : ''}`}
      aria-hidden="true"
    >
      <span className={`${styles.layer} ${styles.bars}`} />
      <span className={`${styles.layer} ${styles.center}`} />
    </span>
  )
}
