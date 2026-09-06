export function formatRelativeTime(dateInput: string | number | Date): string {
  if (!dateInput) return '';

  const date = typeof dateInput === 'string' || typeof dateInput === 'number'
    ? new Date(dateInput)
    : dateInput;

  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 45) {
    return 'vừa xong';
  }
  if (diffSec < 90) {
    return '1 phút trước';
  }

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin} phút trước`;
  }

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return `${diffHours} giờ trước`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) {
    return 'hôm qua';
  }
  if (diffDays < 30) {
    return `${diffDays} ngày trước`;
  }

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return `${diffMonths} tháng trước`;
  }

  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears} năm trước`;
}
