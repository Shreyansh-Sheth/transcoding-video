import * as Aws from "aws-sdk";
import stream from "stream";
import ffmpeg from "./ffmpeg";
const s3Client = new Aws.S3({
  endpoint: "https://test-file-console.webwedigital.com",
  accessKeyId: "cl80wvz0b0002buqv12tle0p2",
  secretAccessKey: "DYNevcAGfmV7rxDML5ksNQi0",
  signatureVersion: "v4",
  s3ForcePathStyle: true,
});
const uploadStream = ({ Bucket, Key }: { Bucket: string; Key: string }) => {
  const pass = new stream.PassThrough();
  return {
    writeStream: pass,
    promise: s3Client.upload({ Bucket, Key, Body: pass }).promise(),
  };
};

const BucketName = "upload";
const fileStream = s3Client
  .getObject({
    Bucket: BucketName,
    Key: "videoplayback.mp4",
  })
  .createReadStream();
fileStream.on("error", function (err) {
  console.log(err);
});

ffmpeg(fileStream)
  .preset("hls")
  // setup event handlers
  .on("end", function () {
    console.log("done processing input stream");
  })
  .on("error", function (err) {
    console.log("an error happened: " + err.message);
  })
  .save("./transcode.flv");
// save to file
