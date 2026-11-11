
import { useState } from "react";
import Navbar from "../components/Navbar";
import MovieCard from "../components/MovieCard";

const movies = [
  {
    id: 1,
    title: "Interstellar",
    genre: "Sci-Fi • Adventure",
    rating: "8.7",
    duration: "2h 49m",
    image: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
  },
  {
    id: 2,
    title: "The Batman",
    genre: "Action • Crime",
    rating: "7.8",
    duration: "2h 56m",
    image: "https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg",
  },
  {
    id: 3,
    title: "Dune: Part Two",
    genre: "Sci-Fi • Drama",
    rating: "8.5",
    duration: "2h 46m",
    image: "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
  },
];

type MoviesProps = {
  onChooseMovie: (movie: string) => void;
};

function Movies({ onChooseMovie }: MoviesProps) {
  const [selectedMovie, setSelectedMovie] = useState(1);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar />

      <main className="mx-auto max-w-6xl px-8 py-12">
        <p className="mb-3 text-sm uppercase tracking-widest text-red-500">
          Now showing
        </p>

        <h2 className="mb-3 text-4xl font-bold">
          Choose your movie
        </h2>

        <p className="mb-10 text-zinc-400">
          Pick your favourite movie and book your seats.
        </p>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {movies.map((movie) => (
            <MovieCard
              key={movie.id}
              {...movie}
              selected={selectedMovie === movie.id}
              onSelect={() => setSelectedMovie(movie.id)}
            />
          ))}
        </div>

        <button
          onClick={() => {
            const movie = movies.find((m) => m.id === selectedMovie);
            if (movie) onChooseMovie(movie.title);
          }}
          className="mt-10 rounded-lg bg-red-600 px-8 py-3 font-semibold hover:bg-red-700"
        >
          Continue to seat selection →
        </button>
      </main>
    </div>
  );
}

export default Movies;
