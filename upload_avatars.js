import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { put } from '@vercel/blob';

const IMAGE_DIR = './resources/images/';

async function batchUpload() {
    // 1. Check for the token
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        console.error("❌ Error: BLOB_READ_WRITE_TOKEN is missing. Did you export it?");
        return;
    }

    console.log("Scanning resources/images/ for avatars...\n");
    
    // 2. Read all images in the local folder
    const files = fs.readdirSync(IMAGE_DIR).filter(file => 
        file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')
    );

    console.log("| Original | WebP | Public URL |");
    console.log("|---|---|---|");

    // 3. Process and upload each file
    for (const file of files) {
        const inputPath = path.join(IMAGE_DIR, file);
        
        // Remove the extension to get the raw name (e.g., "juan_dela_cruz.png" -> "juan_dela_cruz")
        const rawBase = file.replace(/\.[^.]+$/, "");
        const outputFilename = `avatars/${rawBase}.webp`;

        // Get original size
        const originalSizeKB = (fs.statSync(inputPath).size / 1024).toFixed(1);

        try {
            // Compress using sharp (256x256 WebP)
            const processedBuffer = await sharp(inputPath)
                .rotate()
                .resize(256, 256, { fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 80, effort: 6, alphaQuality: 80 })
                .toBuffer();

            const webpSizeKB = (processedBuffer.length / 1024).toFixed(1);

            // Upload to Vercel Blob
            const blob = await put(outputFilename, processedBuffer, {
                access: 'public',
                token: process.env.BLOB_READ_WRITE_TOKEN,
                addRandomSuffix: false // We keep the names exact so they match the database
            });

            console.log(`| ${originalSizeKB} KB | ${webpSizeKB} KB | ${blob.url} |`);
        } catch (error) {
            console.error(`❌ Failed to process ${file}:`, error.message);
        }
    }

    console.log("\n✅ Batch upload complete! Please proceed to the SQL Migration step in Supabase.");
}

batchUpload();