import { Link } from 'react-router-dom'
import { appConfig } from '../config/appConfig'
import { cn } from '../lib/cn'

export function Logo({ to = '/', className, showName = true }) {
  return (
    <Link to={to} className={cn('inline-flex items-center gap-2 font-semibold', className)}>
      <img src={appConfig.logo} alt="" className="h-7 w-7 text-primary" />
      {showName && <span>{appConfig.appName}</span>}
    </Link>
  )
}
