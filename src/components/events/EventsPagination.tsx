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
        className="px-3 py-1 rounded bg-white/10 text-white border border-white/20 disabled:opacity-50"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
      >
        Précédent
      </button>
      <span className="text-white/80">Page {page} / {totalPages}</span>
      <button
        className="px-3 py-1 rounded bg-white/10 text-white border border-white/20 disabled:opacity-50"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
      >
        Suivant
      </button>
    </div>
  );
};

export default EventsPagination; 