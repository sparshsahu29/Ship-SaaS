import { Outlet } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { Card, CardBody } from '../components/Card'
import { appConfig } from '../config/appConfig'

/** Centered card layout for public auth pages. */
export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Logo className="mb-6 text-lg" />
      <Card className="w-full max-w-sm">
        <CardBody className="p-6 sm:p-8">
          <Outlet />
        </CardBody>
      </Card>
      <p className="mt-6 text-center text-xs text-muted">
        Need help? <a className="underline" href={`mailto:${appConfig.supportEmail}`}>{appConfig.supportEmail}</a>
      </p>
    </div>
  )
}
