import { Handler, S3Event } from "aws-lambda";
import sharp from "sharp";
import aws from "aws-sdk";
const s3 = new aws.S3();

type Metadata = {
  resize: number;
  resizeName?: string;
  resizeWithOriginal?: boolean;
};

export const handler: Handler<S3Event> = async (event, context) => {
  try {
    // Get the object from the event and show its content type
    const bucket = event.Records[0].s3.bucket.name;
    const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));
    const contentType = "image/webp";

    // Get image from S3
    const originalImage = await s3.getObject({ Bucket: bucket, Key: key }).promise();
    if (!originalImage?.Body) return;
    const metadata: Metadata | undefined =
      originalImage.Metadata?.json && JSON.parse(originalImage.Metadata?.json);

    for (let k in metadata) {
      const key = k as keyof Metadata;
      if (typeof metadata[key] === "string")
        (metadata[key] as string) = decodeURIComponent(metadata[key] as string);
    }

    let resizedImage = sharp(originalImage.Body as Buffer, { animated: true }).webp({
      effort: 2,
      quality: 80,
    });

    if (metadata) {
      const { resize, resizeName, resizeWithOriginal } = metadata;
      if (resize) {
        await s3
          .putObject({
            Bucket: bucket,
            Key: resizeName ? key.slice(0, key.lastIndexOf("/") + 1) + resizeName : key,
            Body: await resizedImage.resize(resize).toBuffer(),
            ContentType: contentType, // specify the new content type
          })
          .promise();

        if (!resizeWithOriginal) return;
      }
    }

    await s3
      .putObject({
        Bucket: bucket,
        Key: key,
        Body: await resizedImage.toBuffer(),
        ContentType: contentType, // specify the new content type
      })
      .promise();
      
  } catch (error) {
    console.log(error);
    return;
  }
};
