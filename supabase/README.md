# Supabase migrations

Bu klasördeki SQL dosyalarını Supabase Dashboard → SQL Editor üzerinden çalıştırın.

1. **001_categories_companies.sql** – `categories` ve `companies` tablolarını oluşturur, örnek kategorileri ekler ve `products` tablosuna `category_id`, `company_id`, `is_private`, `rating` sütunlarını ekler (varsa).

Önce bu migration'ı çalıştırmadan "Ürün / Aksiyon Ekle" sayfasındaki kategori listesi boş olur ve yeni alanlar hata verebilir.
