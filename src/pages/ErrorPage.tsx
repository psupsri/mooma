import { isRouteErrorResponse, Link, useRouteError } from 'react-router'

export function ErrorPage() {
  const error = useRouteError()
  // Rendered with no error when used as the catch-all "*" route.
  const notFound = !error || (isRouteErrorResponse(error) && error.status === 404)

  return (
    <section>
      <h1>{notFound ? 'Page not found' : 'Something went wrong'}</h1>
      <p>
        {notFound
          ? "The page you're looking for doesn't exist."
          : error instanceof Error
            ? error.message
            : 'An unexpected error occurred.'}
      </p>
      <p>
        <Link to="/">Back to movies</Link>
      </p>
    </section>
  )
}
