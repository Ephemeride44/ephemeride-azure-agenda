interface EventsPaginationProps {
  page: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

const EventsPagination = ({ page, total, pageSize, onPageChange }: EventsPaginationProps) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex justify-end items-center gap-2 mt-4">
      <button
        className="px-3 py-1 rounded border transition-colors
          bg-white text-black border-zinc-300
          hover:bg-zinc-100 hover:border-zinc-400
          dark:bg-zinc-900 dark:text-white dark:border-zinc-700
          dark:hover:bg-zinc-800 dark:hover:border-zinc-500
        "
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
      >
        Précédent
      </button>
      <span className="text-zinc-700 dark:text-zinc-200">Page {page} / {totalPages}</span>
      <button
        className="px-3 py-1 rounded border transition-colors
          bg-white text-black border-zinc-300
          hover:bg-zinc-100 hover:border-zinc-400
          dark:bg-zinc-900 dark:text-white dark:border-zinc-700
          dark:hover:bg-zinc-800 dark:hover:border-zinc-500
        "
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
      >
        Suivant
      </button>
    </div>
  );
};

export default EventsPagination; 