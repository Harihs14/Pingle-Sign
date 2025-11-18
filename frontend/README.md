# PDF Signing Application

A web application for creating and managing PDF signing templates with placeholders.

## Features

- Create templates by uploading PDFs
- Add signing placeholders (Signature, Initial, Stamp, Company, Full name, Email, Sign date, Text, Job title, Checkbox)
- Drag and drop fields onto PDF pages
- Resize and reposition placeholders
- Save templates to MySQL database
- View and manage all templates

## Setup

### Prerequisites

- Node.js (v18 or higher)
- MySQL (v8 or higher)
- npm or yarn

### Backend Setup

1. Navigate to the server directory:

```bash
cd server
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the server directory (optional):

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=signing_app
PORT=3001
```

4. Make sure MySQL is running and create the database (it will be created automatically if it doesn't exist)

5. Start the server:

```bash
npm run dev
```

The server will run on `http://localhost:3001`

### Frontend Setup

1. Install dependencies (from root directory):

```bash
npm install
```

2. Create a `.env` file in the root directory (optional):

```env
VITE_API_URL=http://localhost:3001
```

3. Start the development server:

```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

## Database Schema

The application uses a MySQL database with the following schema:

```sql
CREATE TABLE templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  pdf_path VARCHAR(500) NOT NULL,
  placeholders JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## API Endpoints

- `GET /api/templates` - Get all templates
- `GET /api/templates/:id` - Get template by ID
- `POST /api/templates` - Create new template (with PDF upload)
- `PUT /api/templates/:id/placeholders` - Update template placeholders
- `DELETE /api/templates/:id` - Delete template

## Usage

1. Start both the backend and frontend servers
2. Open `http://localhost:5173` in your browser
3. Click "Add Template" to create a new template
4. Upload a PDF and give it a name
5. Drag fields from the sidebar onto the PDF
6. Resize and reposition placeholders as needed
7. Click "Save Template" to save your template
8. View and manage templates from the landing page

## Project Structure

```
sign/
├── server/              # Backend Express server
│   ├── index.js        # Main server file
│   └── package.json    # Server dependencies
├── src/
│   ├── components/
│   │   ├── TemplateList.jsx  # Template listing page
│   │   ├── PDFEditor.jsx      # PDF editor with placeholders
│   │   └── ui/               # Shadcn UI components
│   ├── App.jsx         # Main app component
│   └── main.jsx        # Entry point
└── uploads/            # Uploaded PDF files (created automatically)
```

## Technologies Used

- **Frontend**: React, Vite, Tailwind CSS, Shadcn UI
- **Backend**: Express.js, MySQL
- **PDF**: react-pdf, pdf-lib
- **File Upload**: Multer
