const fs = require("fs");
const path = require("path");

// ----------------------------------------------------
// PATHS
// ----------------------------------------------------

const TEMPLATE = path.join(__dirname, "../templates/article-template.html");

const SOURCE = path.join(__dirname, "../articles-source");

const OUTPUT = path.join(__dirname, "../articles");

// ----------------------------------------------------
// CREATE OUTPUT FOLDER
// ----------------------------------------------------

if (!fs.existsSync(OUTPUT)) {

    fs.mkdirSync(OUTPUT);

}

// ----------------------------------------------------
// READ MARKDOWN FILES
// ----------------------------------------------------

const markdownFiles = fs.readdirSync(SOURCE)
.filter(file => file.endsWith(".md"));

if (markdownFiles.length === 0) {

    console.log("No markdown files found.");

    process.exit();

}

// ----------------------------------------------------
// PROCESS EACH FILE
// ----------------------------------------------------

markdownFiles.forEach(file => {

    console.log("--------------------------------");

    console.log("Processing :", file);

    console.log("--------------------------------");

    const markdown = fs.readFileSync(
        path.join(SOURCE, file),
        "utf8"
    );

    const lines = markdown.split("\n");

    const meta = {};

    const content = [];

    let readingContent = false;

    lines.forEach(line => {

        if (!readingContent && line.startsWith("@")) {

            const index = line.indexOf(":");

            const key = line.substring(1, index).trim();

            const value = line.substring(index + 1).trim();

            meta[key] = value;

            return;

        }

        if (line.trim() === "" && !readingContent) {

            return;

        }

        readingContent = true;

        content.push(line);

    });

// --------------------------------------------
// READ TEMPLATE
// --------------------------------------------

const htmlTemplate = fs.readFileSync(TEMPLATE, "utf8");

// --------------------------------------------
// VERY SIMPLE MARKDOWN CONVERTER
// --------------------------------------------

let html = content.join("\n");

// H1

html = html.replace(/^# (.*)$/gm, "<h1>$1</h1>");

// H2

html = html.replace(/^## (.*)$/gm, "<h2>$1</h2>");

// H3

html = html.replace(/^### (.*)$/gm, "<h3>$1</h3>");

// Quote

html = html.replace(/^> (.*)$/gm, "<blockquote>$1</blockquote>");

// Bullet List

html = html.replace(/^- (.*)$/gm, "<li>$1</li>");

// Wrap consecutive LI

html = html.replace(
/(<li>.*<\/li>\n?)+/g,
match => "<ul>\n"+match+"\n</ul>"
);

// Paragraphs

html = html.split("\n\n").map(block=>{

if(block.startsWith("<")) return block;

return `<p>${block}</p>`;

}).join("\n");

// --------------------------------------------
// PLACEHOLDER REPLACEMENT
// --------------------------------------------

let output = htmlTemplate;

output = output.replaceAll("{{TITLE}}",meta.title || "");

output = output.replaceAll("{{DESCRIPTION}}",meta.description || "");

output = output.replaceAll("{{CATEGORY}}",meta.category || "");

output = output.replaceAll("{{KEYWORDS}}",meta.keywords || "");

output = output.replaceAll("{{AUTHOR}}",meta.author || "");

output = output.replaceAll("{{DATE}}",meta.date || "");

output = output.replaceAll("{{READING_TIME}}",meta.readingTime || "");

output = output.replaceAll("{{COVER_IMAGE}}",meta.cover || "");

output = output.replaceAll("{{CONTENT}}",html);

// --------------------------------------------
// SAVE HTML
// --------------------------------------------

const outputFile = path.join(
OUTPUT,
meta.slug + ".html"
);

fs.writeFileSync(
outputFile,
output,
"utf8"
);

console.log("Generated :",outputFile);

});