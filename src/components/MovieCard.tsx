import { Link } from 'react-router'
import type { Movie } from '../api/types'
import { MoviePoster } from './MoviePoster'

type Props = {
  movie: Movie
}

export function MovieCard({ movie }: Props) {
  return (
    <Link to={`/movies/${movie.id}`} className="movie-card" aria-label={`${movie.title} — view showtimes`}>
      <MoviePoster movie={movie} />
      <h3 className="movie-card__title" title={movie.title}>
        {movie.title}
      </h3>
    </Link>
  )
}

export function MovieCardSkeleton() {
  return (
    <div className="movie-card movie-card--skeleton" aria-hidden="true">
      <div className="poster skeleton" />
      <div className="skeleton skeleton--text" />
    </div>
  )
}
