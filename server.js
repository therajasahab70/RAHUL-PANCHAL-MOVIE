const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// 🔐 आपका एडमिन पासवर्ड यहाँ सेट है
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "RAHUL70@"; 

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// पोस्टर इमेज स्टोर करने के लिए फोल्डर सुनिश्चित करें
const posterDir = path.join(__dirname, 'public', 'posters');
if (!fs.existsSync(posterDir)) {
    fs.mkdirSync(posterDir, { recursive: true });
}

// थीम फोटो को सुरक्षित नाम से सेव करने का स्टोरेज
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, posterDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'poster-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// मूवीज़ का अस्थायी डेटाबेस
let moviesList = [];

// 1. नई मूवी जोड़ने का API (पासवर्ड प्रोटेक्टेड)
app.post('/api/add-movie', upload.single('posterFile'), (req, res) => {
    try {
        const { title, videoUrl, downloadUrl, password } = req.body;
        
        if (password !== ADMIN_PASSWORD) {
            return res.status(403).json({ error: 'गलत पासवर्ड! आप अपलोड नहीं कर सकते।' });
        }
        if (!title || !videoUrl) {
            return res.status(400).json({ error: 'नाम और वीडियो लिंक ज़रूरी हैं!' });
        }

        let posterUrl = '';
        if (req.file) {
            posterUrl = `/posters/${req.file.filename}`;
        }
        
        const newMovie = {
            id: Date.now().toString(),
            title: title,
            posterUrl: posterUrl,
            videoUrl: videoUrl,
            downloadUrl: downloadUrl || videoUrl
        };
        
        moviesList.push(newMovie);
        res.status(201).json({ message: 'Movie added successfully', movie: newMovie });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'सर्वर एरर।' });
    }
});

// 2. मूवी डिलीट करने का API (पासवर्ड प्रोटेक्टेड)
app.post('/api/delete-movie', (req, res) => {
    const { id, password } = req.body;
    
    if (password !== ADMIN_PASSWORD) {
        return res.status(403).json({ error: 'गलत पासवर्ड!' });
    }

    const movieIndex = moviesList.findIndex(m => m.id === id);
    if (movieIndex === -1) {
        return res.status(404).json({ error: 'मूवी नहीं मिली।' });
    }

    // सर्वर से पोस्टर फ़ाइल भी हटाएँ
    const movie = moviesList[movieIndex];
    if (movie.posterUrl) {
        const filePath = path.join(__dirname, 'public', movie.posterUrl);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    moviesList.splice(movieIndex, 1);
    res.json({ message: 'Movie deleted successfully' });
});

// 3. पब्लिक लिस्ट देखने का API
app.get('/api/movies', (req, res) => {
    res.json({
        totalMovies: moviesList.length,
        movies: moviesList
    });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
