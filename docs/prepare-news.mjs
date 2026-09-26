// Reviewed summaries of the company's public articles; run only to refresh seed assets.
import fs from 'node:fs';
const source = JSON.parse(fs.readFileSync('docs/reference-news.json', 'utf8'));
const summaries = [
  ['Sàng lọc đồ dùng trước khi chuyển văn phòng', 'Di dời là dịp rà soát tài liệu, thiết bị và cách tổ chức không gian.', 'Phân nhóm đồ cần giữ, đồ có thể trao tặng và đồ không còn sử dụng trước khi đóng gói. Việc giảm đồ dư thừa giúp việc sắp xếp tại địa điểm mới thuận tiện hơn.\n\nVới tài liệu và thiết bị chứa dữ liệu, doanh nghiệp cần thống nhất cách lưu trữ, bàn giao hoặc xử lý theo quy trình nội bộ.'],
  ['Bố trí văn phòng sau khi di dời', 'Một mặt bằng hợp lý bắt đầu từ nhu cầu làm việc của từng bộ phận.', 'Phân biệt khu tập trung, khu trao đổi nhóm và khu thiết bị dùng chung trước khi kê bàn ghế. Chuẩn bị sơ đồ vị trí để đội vận chuyển bàn giao đúng khu vực.\n\nSắp xếp và ghi nhãn dây điện, dây mạng giúp việc kiểm tra, sử dụng và vệ sinh sau này thuận tiện hơn.'],
  ['Thông tin tuyển dụng dự án Cần Giờ', 'Đất Phương Nam đăng thông tin kết nối lao động cho dự án Cần Giờ ngày 19/09/2026.', 'Thông báo trên website công ty giới thiệu cơ hội dành cho lao động phổ thông và thợ có tay nghề, với các vị trí phụ việc, thợ và tổ trưởng.\n\nNgười quan tâm nên liên hệ công ty để xác nhận vị trí còn tuyển, hồ sơ, điều kiện công việc, tiền lương và lịch tiếp nhận hiện tại trước khi đăng ký.'],
  ['Kết nối doanh nghiệp và người lao động', 'Các kênh tiếp nhận nhu cầu dịch vụ và thông tin việc làm tại Đất Phương Nam.', 'Doanh nghiệp có thể trao đổi nhu cầu làm sạch, chuyển văn phòng, bổ sung nhân lực và bảo trì công trình. Người lao động có thể liên hệ để hỏi thông tin tuyển dụng và cách đăng ký.\n\nChuẩn bị nội dung cần tư vấn cùng số điện thoại liên hệ giúp nhân viên chuyển thông tin đến bộ phận phù hợp.'],
  ['Chuẩn bị kế hoạch chuyển nhà xưởng', 'Di dời thiết bị cần phối hợp với lịch sản xuất và năng lực tiếp nhận tại địa điểm mới.', 'Xác định thiết bị, khối lượng, thứ tự di chuyển và thời điểm có thể ngừng vận hành trước khi thống nhất phương án. Việc khảo sát hai địa điểm giúp làm rõ điều kiện tiếp cận và nhân lực cần bố trí.\n\nDoanh nghiệp nên phân công người phụ trách bàn giao và trao đổi với đơn vị di dời về các yêu cầu kỹ thuật của thiết bị.'],
  ['Chuẩn bị vệ sinh nhà cửa dịp Tết', 'Lập danh sách khu vực và hạng mục giúp chủ động lịch làm sạch cuối năm.', 'Thống nhất phạm vi cần vệ sinh, tình trạng bề mặt và thời gian bàn giao trước khi bố trí thực hiện. Nhà ở, văn phòng và công trình sau xây dựng cần cách tiếp cận phù hợp với hiện trạng.\n\nNếu chưa xác định được diện tích hoặc khối lượng, khách hàng có thể hẹn nhân viên khảo sát trước khi nhận báo giá.'],
  ['Sắp xếp nhà gọn gàng từ những việc nhỏ', 'Bài viết chia sẻ góc nhìn về không gian ngăn nắp và sinh hoạt hằng ngày.', 'Đồ đạc có vị trí cố định giúp việc tìm kiếm và dọn dẹp dễ hơn. Có thể bắt đầu từ bàn làm việc hoặc một kệ nhỏ, phân loại đồ đang dùng và đồ chưa cần đến.\n\nDuy trì lịch chăm sóc không gian phù hợp với sinh hoạt gia đình để công việc không dồn lại vào cuối tuần.'],
  ['Chọn máy chà sàn theo không gian làm việc', 'Diện tích, lối đi và bề mặt cần làm sạch là những yếu tố nên khảo sát trước.', 'Máy đẩy tay và máy ngồi lái phù hợp với những điều kiện vận hành khác nhau. Việc lựa chọn cần xét tới diện tích, vật cản, khả năng di chuyển và người vận hành.\n\nKhi thuê dịch vụ vệ sinh, hãy mô tả hiện trạng sàn để đội kỹ thuật đề xuất thiết bị và phương án phù hợp.'],
  ['Chăm sóc máy hút bụi gia đình', 'Bảo dưỡng định kỳ giúp thiết bị hoạt động ổn định trong công việc dọn dẹp.', 'Kiểm tra túi chứa bụi, bộ lọc và đường hút theo hướng dẫn của nhà sản xuất. Tránh để bụi tích tụ làm cản luồng khí.\n\nSử dụng đúng loại đầu hút, đúng bề mặt và giới hạn vận hành của thiết bị; ngắt điện trước khi vệ sinh hoặc kiểm tra máy.'],
  ['Giảm rác hữu cơ tại văn phòng', 'Website công ty chia sẻ ý tưởng tận dụng bã cà phê và vỏ trái cây.', 'Phân loại rác hữu cơ và giữ khu pha chế sạch sẽ là những bước nhỏ để xây dựng thói quen văn phòng xanh.\n\nKhi chọn sản phẩm làm sạch, hãy kiểm tra hướng dẫn sử dụng và tính phù hợp với bề mặt. Với vết bẩn khó xử lý hoặc vật liệu đặc biệt, nên trao đổi với nhân viên kỹ thuật.'],
  ['Một góc ký ức Cần Thơ qua ảnh cũ', 'Câu chuyện về nhịp sống và những phương tiện quen thuộc của Tây Đô xưa.', 'Từ hình ảnh đường Lê Lợi, bài viết gợi lại xe đạp lôi, xe máy và vẻ thanh lịch trong đời sống đô thị Cần Thơ.\n\nNhững tư liệu cũ mở ra một cách nhìn về sự thay đổi của đường phố, con người và nếp sống địa phương qua thời gian.'],
  ['Nhìn lại đường Lý Tự Trọng năm 1991', 'Một bài viết tư liệu trong chuyên mục câu chuyện đô thị của website công ty.', 'Hình ảnh đường Lý Tự Trọng đầu thập niên 1990 gợi lại hàng cây, kiến trúc phố và nhịp đi lại của Sài Gòn thời kỳ đổi mới.\n\nTư liệu đời sống thường ngày giúp người đọc quan sát những thay đổi của thành phố và lưu giữ ký ức về một giai đoạn đã qua.'],
];
const news = [];
for (const [i, n] of source.entries()) {
  const [title, excerpt, body] = summaries[i];
  const image = `/images/news-${i + 1}.${n.image.split('?')[0].endsWith('.png') ? 'png' : 'jpg'}`;
  const response = await fetch(n.image.replace('http:', 'https:'));
  if (!response.ok) throw new Error(`Cannot download image ${i}`);
  fs.writeFileSync(`public${image}`, Buffer.from(await response.arrayBuffer()));
  news.push({id:`official-${i + 1}-${n.url.split('/').pop().slice(0,55)}`, title, excerpt, category:n.category, image, body:`${body}\n\nBiên tập từ bài viết trên website công ty.\n\nNguồn: ${n.url}`, created:Date.parse(n.date)/1000});
}
fs.writeFileSync('src/data/news.json', JSON.stringify(news,null,2)+'\n');
const banner = await fetch('https://cdn.hstatic.net/themes/200001053360/1001393975/14/page_banner.jpg?v=348');
if (!banner.ok) throw new Error('Cannot download banner');
fs.writeFileSync('public/images/page-banner.jpg',Buffer.from(await banner.arrayBuffer()));
console.log(`Saved ${news.length} articles and public images.`);
