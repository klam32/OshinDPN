# Oshin Thời Đại – Đất Phương Nam

Website chăm sóc khách hàng bằng **React + Python FastAPI**, tông xanh đậm và vàng. Gồm landing page, tài khoản khách hàng, trang quản trị, tư vấn Nở/nhân viên, đặt dịch vụ, chiết tính, Excel, email và phản hồi.

## Chạy dự án

Môi trường đã kiểm tra: Windows, Node.js 24, Python 3.13, Google Chrome.

Mở PowerShell tại thư mục `oshin-phuong-nam`.

```powershell
# Cài lần đầu nếu chưa có môi trường và thư viện
python -m venv .venv
.\.venv\Scripts\python -m pip install -r backend\requirements.txt
npm ci --cache .npm-cache

# Build React rồi chạy cả website và API bằng một máy chủ
npm run build
.\.venv\Scripts\python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Mở **http://127.0.0.1:8000**. API docs: http://127.0.0.1:8000/docs.

Để phát triển với React tự tải lại, mở hai terminal:

```powershell
# Terminal 1
.\.venv\Scripts\python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000

# Terminal 2
npm run dev
```

Mở **http://127.0.0.1:5173**. Vite chuyển tiếp `/api` đến Python ở cổng 8000.

## Tài khoản Admin

Trong workspace hiện tại, tài khoản Admin cục bộ đã được tạo. Email và mật khẩu ngẫu nhiên nằm trong **`backend/data/admin-access.txt`**, được loại khỏi Git.

Khi cài một bản mới, tạo tài khoản bằng lệnh sau. Không có mật khẩu Admin mặc định trong mã nguồn:

```powershell
.\.venv\Scripts\python -m backend.manage admin@oshin.local --generate
```

Hoặc bỏ `--generate` để nhập mật khẩu riêng (tối thiểu 12 ký tự). Lệnh không ghi đè tài khoản đã tồn tại. Một lựa chọn khác là đặt `ADMIN_EMAIL` và `ADMIN_PASSWORD` trong `backend/.env` trước lần khởi động đầu tiên.

Nhấn **Đăng nhập** trên website. Tài khoản Admin tự chuyển đến **`/#admin`**. Khách hàng đăng ký trực tiếp trên giao diện và luôn được cấp quyền khách hàng.


## Đăng nhập bằng OTP và Google

Mọi lần đăng ký hoặc đăng nhập bằng mật khẩu đều cần mã OTP 6 chữ số gửi qua SMTP. Mã có hiệu lực 5 phút, dùng một lần, tối đa 5 lần nhập và chỉ được gửi lại sau 60 giây. Vì vậy phải cấu hình SMTP trước khi người dùng đăng ký hoặc đăng nhập. Nội dung OTP được xóa khỏi hàng đợi email ngay sau khi SMTP chấp nhận thư.

Tạo bí mật ký OTP một lần và đặt kết quả vào `AUTH_SECRET` trong `backend/.env`:

```powershell
.\.venv\Scripts\python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Để bật Google OAuth trong Google Cloud Console:

1. Chọn đúng project của Oshin, mở **Google Auth Platform** và hoàn thiện **Branding**, **Audience**, **Data Access**. Nếu ứng dụng đang ở chế độ Testing, thêm tài khoản cần thử vào **Test users**.
2. Vào **Clients → Create client → Web application**. Khi chạy local, thêm JavaScript origin `http://127.0.0.1:5173` và redirect URI chính xác `http://127.0.0.1:8000/api/auth/google/callback`.
3. Điền Client ID và Client secret mới của riêng dự án Oshin vào `backend/.env`:

```dotenv
AUTH_SECRET=chuoi_bi_mat_ngau_nhien_it_nhat_32_ky_tu
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://127.0.0.1:8000/api/auth/google/callback
FRONTEND_URL=http://127.0.0.1:5173
```

Không đưa `backend/.env`, Client secret hoặc service-account JSON lên Git. Sau khi sửa biến môi trường, khởi động lại backend.

Khi deploy, thay hai URL bằng tên miền HTTPS thật, ví dụ:

```dotenv
GOOGLE_REDIRECT_URI=https://oshin.example.com/api/auth/google/callback
FRONTEND_URL=https://oshin.example.com
COOKIE_SECURE=true
ALLOWED_ORIGINS=https://oshin.example.com
```

Sau đó thêm đúng URI HTTPS đó vào **Authorized redirect URIs** của OAuth client. Ký tự, giao thức, tên miền, cổng và đường dẫn phải khớp hoàn toàn. Trên Blitz cũng cần khai báo `AUTH_SECRET`, ba biến `GOOGLE_*`, `FRONTEND_URL` và toàn bộ biến `SMTP_*` trong phần Environment.

## Chức năng đã triển khai

| Khu vực             | Hành vi                                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Trang chủ           | Dịch vụ, lọc theo nhu cầu, giới thiệu, quy trình, Blog, câu hỏi thường gặp, hotline và liên hệ                                             |
| Tài khoản           | Đăng ký/đăng nhập bằng OTP email hoặc Google, đăng xuất, phiên HttpOnly, xem yêu cầu và phản hồi của mình                                                            |
| Khách vãng lai      | Đặt dịch vụ không cần tài khoản; dữ liệu gắn với phiên trình duyệt. Khi đăng ký/đăng nhập, các yêu cầu của phiên được chuyển vào tài khoản |
| Biểu mẫu            | 7 nhóm dịch vụ, có danh mục con và các trường diện tích, thời gian, số nhân sự, số kiện, địa chỉ đến, tình trạng cây… tương ứng            |
| Khảo sát            | Chỉ cần chọn dịch vụ, họ tên, điện thoại và địa chỉ; email là tùy chọn                                                                     |
| Chiết tính          | Backend kiểm tra đầu vào và tính từ đơn giá cấu hình; hiển thị từng dòng, khối lượng, đơn giá, thuế và tổng                                |
| Excel               | Tạo `.xlsx` ngay khi lưu yêu cầu; sau đó bổ sung tóm tắt AI nếu có cấu hình. Có thông tin khách, hạng mục, tổng, tình trạng và ghi chú     |
| Email               | Hàng đợi riêng cho khách và Admin, đính kèm Excel, lưu trạng thái và lỗi, có gửi lại khi chưa thành công                                   |
| Nở                  | Tư vấn giới hạn trong dịch vụ công ty; dùng Gemini qua backend khi được cấu hình; có tư vấn cơ bản khi chưa có khóa hoặc API lỗi           |
| Nhân viên trực tiếp | Admin bật nhận tư vấn, trả lời các hội thoại; khách cập nhật mỗi 3 giây, Admin mỗi 5 giây                                                  |
| Trạng thái online   | Heartbeat 20 giây; hết hiệu lực sau 50 giây nếu mất kết nối. Ngoại tuyến thì tin nhắn mới được Nở tiếp nhận                                |
| Đơn hàng            | Tiếp nhận → khảo sát/xác nhận → thực hiện → hoàn thành → thanh toán; có hủy ở những bước cho phép                                          |
| Giá sau khảo sát    | Admin nhập giá cuối cùng và mô tả thỏa thuận trước khi xác nhận đơn                                                                        |
| Thanh toán          | Khung QR sau khi công việc hoàn thành; ảnh QR thật xuất hiện khi đã có giá xác nhận và cấu hình ngân hàng                                  |
| Phản hồi            | Đánh giá 1–5 sao, phân loại, nội dung, mã đơn/giao dịch; Admin trả lời và khách theo dõi kết quả                                           |
| Quản trị            | Thêm/sửa/ẩn dịch vụ, sửa cấu trúc biểu mẫu, Blog nháp/xuất bản/xóa, khóa tài khoản, phân quyền, nội dung trang chủ và cấu hình             |

## Cấu hình AI, email và ngân hàng

Sao chép `backend/.env.example` thành `backend/.env`. Khởi động lại backend sau khi đổi biến môi trường. **Không đặt API key hoặc mật khẩu SMTP trong biến `VITE_*`.**

### Nở / Vertex AI

```dotenv
LLM_NAME=vertex
VERTEX_MODEL_NAME=gemini-2.5-flash
PROJECT_ID=your_google_cloud_project_id
LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
# Khi deploy có thể dùng một trong hai biến dưới thay cho đường dẫn file:
GOOGLE_APPLICATION_CREDENTIALS_JSON=your_service_account_json
GOOGLE_APPLICATION_CREDENTIALS_BASE64=your_base64_service_account_json
```

Chọn model được bật trong Google Cloud project. Backend sử dụng `generateContent` và Application Default Credentials theo [tài liệu chính thức của Vertex AI](https://cloud.google.com/vertex-ai/generative-ai/docs/start/quickstart).

System prompt trong `backend/logic.py` lấy danh mục dịch vụ và thông tin liên hệ hiện tại từ database. Nở không tự sửa đơn, xác nhận giao dịch hoặc tạo đơn giá. Phần tóm tắt yêu cầu được đưa vào workbook; các con số luôn do Python tính.

Khi chưa cấu hình, giao diện ghi **“Tư vấn tự động cơ bản”** và Admin nhìn thấy trạng thái chưa cấu hình AI. Kiểm thử tự động dùng phản hồi AI giả lập, không gọi dịch vụ trả phí.

### Email phản hồi hai chiều

- Khi khách gửi phản hồi, hệ thống tạo email đến `FEEDBACK_ADMIN_EMAIL`; nếu để trống thì dùng `ADMIN_EMAIL`, sau đó mới dùng email trong Cấu hình hệ thống. Email có mã phản hồi, thông tin liên hệ, đánh giá, mã yêu cầu/giao dịch và nội dung chi tiết.
- Khi Admin đổi trạng thái hoặc nội dung trả lời, hệ thống gửi email kết quả đến địa chỉ khách đã nhập. Lưu lại cùng dữ liệu nhưng không thay đổi sẽ không tạo email trùng.
- Mọi email nằm trong Hàng đợi email, có trạng thái `pending`, `sending`, `sent` hoặc `failed`; Admin có thể gửi lại email lỗi.
- Email phản hồi bắt buộc nhập địa chỉ email hợp lệ để bảo đảm khách nhận được kết quả xử lý.

### Email

```dotenv
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your_username
SMTP_PASSWORD=your_smtp_password
SMTP_FROM=service@your-company.com
SMTP_TLS=true
```

Cổng 587 dùng STARTTLS, cổng 465 dùng SSL. Email nhận phía Admin lấy từ **Cấu hình hệ thống → Email Admin nhận yêu cầu**.

Khi chưa có SMTP, đơn và Excel vẫn lưu bình thường; email ở trạng thái **Chờ gửi**. Sau khi cấu hình, vào **Email báo giá → Gửi lại**. “Đã gửi” có nghĩa SMTP đã chấp nhận email, không phải xác nhận email đã vào inbox. Lỗi và tiến trình gửi gián đoạn được hiển thị để xử lý.

Luồng khảo sát không nhập email chỉ gửi về phía Admin. Chiết tính sửa sau khảo sát được cập nhật trên trang khách và file Excel; email ban đầu là bản tiếp nhận yêu cầu tại thời điểm gửi.

### Đơn giá và QR

Các đơn giá seed là **số liệu minh họa**, không được lấy làm bảng giá chính thức của doanh nghiệp. Admin sửa đơn giá nhóm tại **Quản lý dịch vụ**, đơn giá vận chuyển theo km và phần trăm thuế tại **Cấu hình hệ thống**. Những loại dịch vụ con trong một nhóm dùng cùng quy tắc đơn giá tham khảo của nhóm; Admin xác nhận mức giá thực tế sau khảo sát.

Nhập ngân hàng, số tài khoản, tên chủ tài khoản và URL HTTPS của ảnh QR hoặc đường dẫn `/images/...`. Có thể đặt ảnh QR vào `public/images/`, sau đó build lại frontend. QR là ảnh do công ty/ngân hàng cung cấp; chưa tích hợp webhook ngân hàng. Admin chỉ đánh dấu **Đã thanh toán** sau khi đối soát.

## Kiểm thử

```powershell
# 14 kiểm thử backend, database tạm tách biệt
.\.venv\Scripts\python -m unittest backend.test_app -v

# Build và kiểm thử trình duyệt Chrome
npm run test:e2e
```

Bộ kiểm thử trình duyệt tự khởi động backend riêng ở cổng 8001 với database tạm, tắt kết nối AI/email bên ngoài, không ghi dữ liệu thử vào database sử dụng thực tế. Trace và ảnh khi thất bại nằm trong `test-results/`.

## Cấu trúc

```text
src/
  App.jsx                  # Điều phối trang, phiên và các modal
  components/Home.jsx      # Landing page
  components/Header.jsx    # Logo, menu hai cấp và tìm kiếm
  components/Header.css    # Màu và bố cục header theo website mẫu
  components/Booking.jsx   # Form riêng, khảo sát, chiết tính
  components/Customer.jsx  # Tài khoản, chat, phản hồi, theo dõi đơn
  components/Admin.jsx     # Giao diện quản trị
  components/ui.jsx        # Thành phần dùng chung
  data/catalog.json        # Danh mục seed
  lib/api.js               # Kết nối API
  index.css                # Hệ thống màu, bố cục và responsive
backend/
  main.py                  # API, phân quyền, trạng thái và kiểm tra dữ liệu
  db.py                    # SQLite, khởi tạo danh mục và nội dung
  logic.py                 # Chiết tính, Nở, Excel, SMTP
  manage.py                # Tạo Admin
  data/oshin.db            # Dữ liệu thực tế, không commit
  data/exports/            # Excel tự động, không commit
tests/                     # Kiểm thử trình duyệt
```

Phiên đăng nhập và phiên khách vãng lai tồn tại 7 ngày. Đăng ký tài khoản giúp khách xem lại yêu cầu sau khi đổi thiết bị hoặc hết phiên. Mật khẩu được băm scrypt, endpoint quản trị kiểm tra vai trò ở server, file Excel kiểm tra chủ sở hữu và lưu văn bản nhập vào dưới dạng chuỗi để tránh Excel thực thi công thức.

## Deploy bằng Docker / Blitz

Repository có `Dockerfile` nhiều giai đoạn. Node chỉ build React; image chạy cuối chỉ chứa Python, backend, catalog và `dist`. `.dockerignore` loại môi trường cục bộ, credential, database, test và tài liệu khỏi build context.

Trên Blitz, chọn build bằng `Dockerfile` và khai báo ít nhất các biến `AUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `COOKIE_SECURE=true`, `ALLOWED_ORIGINS`, `FRONTEND_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` cùng cấu hình SMTP và Vertex cần dùng. Không dán dấu nháy quanh giá trị.

Ứng dụng lắng nghe biến `PORT` của nền tảng và có health endpoint `/api/health`. Nếu cần giữ tài khoản, đơn hàng và phản hồi qua mỗi lần deploy, gắn persistent volume rồi đặt `DATABASE_PATH` đến volume đó, ví dụ `/data/oshin.db`. Nếu không có volume, SQLite có thể mất khi container bị thay thế.

Khi đưa lên tên miền: dùng HTTPS, đặt `COOKIE_SECURE=true`, `ALLOWED_ORIGINS` và `FRONTEND_URL` là origin của website, giữ `/api` cùng origin. `GOOGLE_REDIRECT_URI` phải là URL callback HTTPS chính xác đã thêm trong Google Cloud Console. Đây là triển khai một máy chủ, chưa có hàng đợi công việc phân tán hay tích hợp đối soát ngân hàng tự động.

## Nội dung và hình ảnh

Danh mục 7 nhóm, các dịch vụ con và thông tin liên hệ bám theo [website Đất Phương Nam](https://dichvudatphuongnam.net/) và ảnh người dùng cung cấp. Ảnh dịch vụ và giới thiệu được tải từ CDN của website mẫu, lưu tại `public/images`. Ảnh không gian phòng khách dùng để minh họa từ [Unsplash](https://images.unsplash.com/photo-1600210492486-724fe5c67fb0). Ba bài viết ban đầu là nội dung khởi tạo, Admin có thể biên tập hoặc ẩn trước khi công khai.
