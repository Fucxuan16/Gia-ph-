# Nếp Nhà · Cây gia phả

Nếp Nhà là ứng dụng để nhiều người xem cùng một cây gia phả. Người quản lý mở khóa bằng mật khẩu để thêm, sửa hoặc xóa thành viên. Trang có tìm tên không dấu, thu gọn nhánh, thu phóng và xem quan hệ cha mẹ – con. Các thay đổi được lưu vào Cloudflare D1.

## Thư mục dự án

```text
Nep-Nha-Project/
├── web/               Giao diện, mã JavaScript và hình ảnh
├── worker/            API gia phả và phiên quản lý
├── drizzle/           Các tệp SQL tạo bảng D1
├── scripts/           Tệp dựng ứng dụng
├── .openai/           Cấu hình để tạo Site mới trên ChatGPT Sites
├── .dev.vars.example  Tệp mẫu để đặt mật khẩu thử
├── package.json       Lệnh chạy, kiểm tra và triển khai
├── package-lock.json  Phiên bản thư viện dùng với npm ci
└── wrangler.jsonc     Cấu hình Cloudflare Workers và D1
```

## Đưa mã nguồn lên GitHub

Tạo một repository rồi tải các tệp và thư mục bên trong `Nep-Nha-Project` lên thư mục gốc của repository. `README.md` và `package.json` nên nằm ngay ở thư mục gốc. Giữ cả `.gitignore` khi đưa dự án lên GitHub. GitHub lưu mã nguồn, còn Cloudflare Workers và D1 chạy website có dữ liệu dùng chung.

## Chạy trên máy

Cần Node.js 22 trở lên và npm. Mở terminal trong thư mục dự án.

```sh
npm ci
```

Sao chép `.dev.vars.example` thành `.dev.vars` rồi điền mật khẩu thử vào `TREE_ADMIN_PASSWORD`. Sau đó chạy:

```sh
npm run dev
```

Mở địa chỉ được Wrangler in ra, thường là `http://localhost:8787`. Lệnh này tạo các bảng trong cơ sở dữ liệu trên máy và dựng ứng dụng. Để kiểm tra cú pháp và dựng mã mà không khởi động web, chạy `npm run check`.

## Triển khai lên Cloudflare

1. Đăng nhập Cloudflare và tạo cơ sở dữ liệu D1.

   ```sh
   npx wrangler login
   npx wrangler d1 create nep-nha
   ```

2. Nếu Wrangler hỏi có tự thêm cấu hình hay không, chọn **No** vì dự án đã có cấu hình. Chép ID vừa nhận vào `database_id` trong `wrangler.jsonc`. Giữ tên binding `DB`.
3. Tạo tệp `.env.production` cạnh `wrangler.jsonc`. Trong tệp này, đặt biến `TREE_ADMIN_PASSWORD` bằng mật khẩu bạn chọn cho bản online.
4. Tạo bảng và triển khai.

   ```sh
   npm run db:remote
   npm run deploy -- --secrets-file .env.production
   ```

5. Mở URL do Wrangler trả về. Kiểm tra cây ở chế độ xem, sau đó bấm **Quản lý cây** để kiểm tra việc mở khóa. Khi cập nhật mã ở những lần sau, chạy `npm run deploy`. [Tài liệu Cloudflare D1](https://developers.cloudflare.com/d1/get-started/) · [Quản lý biến bí mật](https://developers.cloudflare.com/workers/configuration/secrets/)

## Khôi phục dữ liệu từ bản sao lưu

Repository này chứa mã nguồn và cấu trúc cơ sở dữ liệu. Dữ liệu thật nằm trong tệp sao lưu gia phả riêng. Để nhập cây từ bản sao lưu vào cơ sở dữ liệu mới, chạy `npm run db:remote` trước, rồi dùng tệp `du-lieu/khoi-phuc.sql` từ ZIP sao lưu. Thay đường dẫn trong lệnh bằng vị trí tệp trên máy bạn.

```sh
npx wrangler d1 execute DB --remote --file "duong-dan/toi/khoi-phuc.sql"
```

Câu lệnh khôi phục nạp dữ liệu khi bảng gia phả chưa có bản ghi. Với cơ sở dữ liệu chạy thử trên máy, dùng `npm run db:local` và đổi `--remote` thành `--local`.
