// Function to generate a random HTML content
function generateRandomHTML() {
  const title = generateRandomString(10);
  const content = generateRandomString(50);
  return `<!DOCTYPE html>
<html lang="en">
{{> head site=site title="${title}"}}
<body>
  <h1>${title}</h1>
  <p>${content}</p>
</body>
</html>`;
}

// Function to generate random string
function generateRandomString(length) {
  const characters =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Function to create n number of random HTML files
async function createRandomHTMLFiles(n, outputPath) {
  const promises = [];
  for (let i = 0; i < n; i++) {
    const fileName = `file_${i + 1}.html`;
    const filePath = `${outputPath}/${fileName}`;
    const htmlContent = generateRandomHTML();
    promises.push(Deno.writeTextFile(filePath, htmlContent));
  }
  await Promise.all(promises);
  return Array.from(
    { length: n },
    (_, i) => `${outputPath}/file_${i + 1}.html`,
  );
}

// Example usage: Generate 5 random HTML files and write them to the specified directory
const numberOfFiles = 5000;
const outputDirectory = "./abc123/pages"; // Specify your output directory here
await createRandomHTMLFiles(numberOfFiles, outputDirectory);
console.log(`Generated ${numberOfFiles} HTML files in ${outputDirectory}`);
