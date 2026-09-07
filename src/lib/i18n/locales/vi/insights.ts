export const insights = {
  title: "Repository Pulse & Insights",
  subtitle: "Phân tích nhịp độ commit, đóng góp của các thành viên và thói quen làm việc của dự án",
  badge: "Insights",
  commandTitle: "Mở Repository Pulse & Insights Dashboard (Thống kê nhịp độ dự án)",
  refresh: "Làm mới",
  close: "Đóng",

  // Metric cards
  totalCommits: "Tổng số Commits",
  totalCommitsDesc: "Số lượng commit đã nạp",
  contributors: "Thành viên đóng góp",
  contributorsDesc: "Số tác giả khác nhau",
  activeBranches: "Nhánh hoạt động",
  activeBranchesDesc: "Số nhánh local & remote",
  repoAge: "Tuổi thọ dự án",
  repoAgeDesc: "Từ commit đầu tiên",

  // Sections
  activityTitle: "Nhịp Độ Commit Theo Thời Gian (Commit Velocity)",
  activitySubtitle: "Số lượng commit qua các tháng/tuần",
  punchCardTitle: "Biểu Đồ Nhiệt Khung Giờ (Commit Punch Card)",
  punchCardSubtitle: "Mật độ commit theo từng giờ trong ngày và thứ trong tuần (Phát hiện giờ cao điểm)",
  contributorsTitle: "Bảng Xếp Hạng Đóng Góp (Top Contributors)",
  contributorsSubtitle: "Tỷ lệ và số lượng đóng góp của các lập trình viên",
  distributionTitle: "Phân Bố Thời Gian Làm Việc",

  // Punch Card Days & Hours
  days: {
    mon: "Thứ 2",
    tue: "Thứ 3",
    wed: "Thứ 4",
    thu: "Thứ 5",
    fri: "Thứ 6",
    sat: "Thứ 7",
    sun: "Chủ nhật",
  },
  peakHour: "Giờ cao điểm nhất:",
  commitsAt: "{count} commits lúc {hour}:00, {day}",

  // Time distribution
  timeOfDay: {
    morning: "Buổi sáng (06:00 - 12:00)",
    afternoon: "Buổi chiều (12:00 - 18:00)",
    evening: "Buổi tối (18:00 - 24:00)",
    night: "Đêm muộn (00:00 - 06:00)",
  },
  workdaysVsWeekend: {
    title: "Ngày trong tuần vs Cuối tuần",
    workdays: "Ngày trong tuần (T2 - T6)",
    weekend: "Cuối tuần (T7 - CN)",
  },

  // Contributor details
  rank: "Hạng",
  author: "Tác giả",
  commitsCount: "{count} commits",
  percentage: "{pct}%",
  firstCommit: "Đầu tiên: {date}",
  latestCommit: "Gần nhất: {date}",
  noData: "Chưa có đủ dữ liệu commit để phân tích.",
};
