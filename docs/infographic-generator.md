Gemini 3 Pro Image (通称 nano banana pro)を使って、infographicを生成するサンプルコード

```ts
import { generateText } from 'ai';
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { textExample2 } from './text-example.js';

async function main() {
    // Check environment variables
    if (!process.env.AI_GATEWAY_API_KEY) {
        console.error('Error: AI_GATEWAY_API_KEY is not set in environment variables');
        console.error('Please set it in .env file');
        process.exit(1);
    }

    // Select which example to use (default: textExample2)
    const selectedText = textExample2;
    const exampleType = 'GitHub Activity Summary' //'Sales Report';

    console.log(`Generating infographic for: ${exampleType}\n`);

    // Create prompt for infographic generation
    // Focused on key metrics only
    const prompt = `Create a professional and clean infographic dashboard based on the following GitHub activity data.

IMPORTANT - Include ONLY these 3 sections:
1. Daily Overview Dashboard - Show total commits, PRs, issues, and active repositories with numbers and simple charts
2. Top Contributors - List contributors with their contribution counts (commits, PRs, issues)
3. Repository Activity - Show activity by repository with key changes IN JAPANESE (日本語で記述)

Design requirements:
- Use a modern, clean dashboard layout
- Use charts, graphs, and progress bars to visualize metrics (bar charts, pie charts, trend indicators)
- DO NOT include user icons, avatars, or profile pictures
- Use simple geometric shapes and icons for repositories (folder icons, git icons)
- Highlight key numbers prominently
- Use color coding for different metric types
- Keep it concise - focus on the most important metrics only
- Ensure text is readable with good contrast

Language requirements:
- Section titles and contributor names: English is fine
- Repository activity descriptions: MUST be in Japanese
- Numbers and metrics: Use standard numeric format

Data to visualize:

${selectedText}

Extract and visualize ONLY the Daily Overview, Top Contributors, and Repository Activity sections. For Repository Activity, write the descriptions in Japanese.`;

    try {
        // Generate images using generateText
        const result = await generateText({
            model: 'google/gemini-3-pro-image',
            prompt: prompt,
        });

        // Display any text response
        if (result.text) {
            console.log('Model response:');
            console.log(result.text);
            console.log();
        }

        // Filter image files
        const imageFiles = result.files.filter((f) =>
            f.mediaType?.startsWith('image/'),
        );

        if (imageFiles.length === 0) {
            console.log('No images were generated');
            return;
        }

        console.log(`Generated ${imageFiles.length} image(s)`);

        // Create output directory
        const outputDir = 'output';
        fs.mkdirSync(outputDir, { recursive: true });

        const timestamp = Date.now();

        // Save each image
        for (const [index, file] of imageFiles.entries()) {
            const extension = file.mediaType?.split('/')[1] || 'png';
            const filename = `infographic-${timestamp}-${index}.${extension}`;
            const filepath = path.join(outputDir, filename);

            // Save to file using uint8Array
            await fs.promises.writeFile(filepath, file.uint8Array);
            console.log(`Saved image to ${filepath}`);
        }

        // Display usage statistics
        console.log('\nUsage:', JSON.stringify(result.usage, null, 2));
    } catch (error) {
        console.error('Error generating infographic:', error);
        process.exit(1);
    }
}

main().catch(console.error);
```