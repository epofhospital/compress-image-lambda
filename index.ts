import { Handler, S3Event } from "aws-lambda";
import sharp from "sharp";
import aws from "aws-sdk";
const s3 = new aws.S3();

export const handler: Handler<S3Event> = async (event, context) => {
  try {
    // Get the object from the event and show its content type
    const bucket = event.Records[0].s3.bucket.name;
    const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));

    // Get image from S3
    const originalImage = await s3.getObject({ Bucket: bucket, Key: key }).promise();
    if (!originalImage?.Body) return;
    const metadata = originalImage.Metadata?.json && JSON.parse(originalImage.Metadata?.json);
    for (const k in metadata) {
      if (typeof metadata[k] === "string") metadata[k] = decodeURIComponent(metadata[k]);
    }
    console.log("test");
    const resizedImage = await sharp(originalImage.Body as Buffer, { animated: true })
      .webp({ effort: 2, quality: 80 })
      .resize(200, 200)
      .toBuffer();

    const targetKey = key.replace(/\.[^/.]+$/, "") + "-thumbnail.webp"; // change extension

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
