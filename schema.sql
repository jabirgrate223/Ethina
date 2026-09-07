-- Quick Capital relational schema (MySQL 8+)
CREATE DATABASE IF NOT EXISTS quick_capital;
USE quick_capital;

CREATE TABLE companies (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  legal_name VARCHAR(160) NOT NULL,
  trading_name VARCHAR(160),
  industry VARCHAR(100),
  annual_revenue DECIMAL(14,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT UNSIGNED NULL,
  full_name VARCHAR(140) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  phone VARCHAR(40),
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('BUSINESS_OWNER','FUNDING_OFFICER','SUPER_ADMIN') NOT NULL DEFAULT 'BUSINESS_OWNER',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
);

CREATE TABLE applications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT UNSIGNED NOT NULL,
  applicant_id BIGINT UNSIGNED NOT NULL,
  requested_amount DECIMAL(14,2) NOT NULL,
  term_months SMALLINT UNSIGNED NOT NULL,
  purpose VARCHAR(255),
  status ENUM('DRAFT','SUBMITTED','IN_REVIEW','DOCUMENTS_NEEDED','APPROVED','DECLINED','FUNDED') NOT NULL DEFAULT 'DRAFT',
  decision_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_applications_company FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT fk_applications_applicant FOREIGN KEY (applicant_id) REFERENCES users(id)
);

CREATE TABLE documents (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  application_id BIGINT UNSIGNED NOT NULL,
  uploaded_by BIGINT UNSIGNED NOT NULL,
  document_type VARCHAR(80) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  verification_status ENUM('PENDING','VERIFIED','REJECTED') NOT NULL DEFAULT 'PENDING',
  reviewer_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_documents_application FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  CONSTRAINT fk_documents_uploader FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_documents_application ON documents(application_id);
