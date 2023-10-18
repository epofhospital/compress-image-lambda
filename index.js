const sharp = require("sharp");
const aws = require("aws-sdk");
const s3 = new aws.S3();

exports.handler = async (event) => {
  try {
    // Get the object from the event and show its content type
    const bucket = event.Records[0].s3.bucket.name;
    const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));
    console.log("tttttttttt", key);

    // Get image from S3
    const originalImage = await s3.getObject({ Bucket: bucket, Key: key }).promise();
    console.log(originalImage);
    // Resize the image using Sharp
    const resizedImage = await sharp(originalImage.Body, { animated: true })
      .webp({ effort: 2, quality: 80 })
      .resize(200, 200) // or any other size
      .toBuffer();

    // Define new filename and metadata if needed
    const targetKey = key.replace(/\.[^/.]+$/, "") + "_small.webp"; // change extension

    // Upload the resized image back to S3
    await s3
      .putObject({
        Bucket: bucket,
        Key: targetKey,
        Body: resizedImage,
        ContentType: "image/webp", // specify the new content type
      })
      .promise();
  } catch (error) {
    console.log(error);
    return;
  }
};
