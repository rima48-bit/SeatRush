
type MovieCardProps = {
  title: string;
  genre: string;
  rating: string;
  duration: string;
  image: string;
  onSelect: () => void;
  selected: boolean;
};

function MovieCard({
  title,
  genre,
  rating,
  duration,
  image,
  onSelect,
  selected,
}: MovieCardProps) {
  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer overflow-hidden rounded-2xl border bg-zinc-900 transition hover:-translate-y-1 ${
        selected ? "border-red-500" : "border-zinc-800"
      }`}
    >
      <img
        src={image}
        alt={title}
        className="h-80 w-full object-cover"
      />

      <div className="p-5">
        <div className="flex justify-between">
          <h3 className="text-xl font-bold">{title}</h3>
          <span className="text-yellow-400">★ {rating}</span>
        </div>

        <p className="mt-2 text-sm text-zinc-400">{genre}</p>
        <p className="mt-2 text-xs text-zinc-500">{duration}</p>

        <button
          className="mt-5 w-full rounded-lg bg-red-600 py-3 font-semibold hover:bg-red-700"
        >
          {selected ? "Selected" : "Select Movie"}
        </button>
      </div>
    </div>
  );
}

export default MovieCard;
