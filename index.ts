import * as Aws from "aws-sdk";
import { randomUUID } from "crypto";
import stream from "stream";
import ffmpeg from "./ffmpeg";
import EventEmitter from "events";
import path from "path";
import { promises as fs, createReadStream, mkdirSync, rmdir, rmSync } from "fs";
const events = new EventEmitter();
const s3Client = new Aws.S3({
  endpoint: "https://test-file-console.webwedigital.com",
  accessKeyId: "cl80wvz0b0002buqv12tle0p2",
  secretAccessKey: "DYNevcAGfmV7rxDML5ksNQi0",
  signatureVersion: "v4",
  s3ForcePathStyle: true,
});
const uploadingEvent = "start-uploading";
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
    Key: "210329_06B_Bali_1080p_013.mp4",
  })
  .createReadStream();
fileStream.on("error", function (err) {
  console.log(err);
});

// ffmpeg(fileStream)
//   .preset("hls")
//   // setup event handlers
//   .on("end", function () {
//     console.log("done processing input stream");
//   })
//   .on("error", function (err) {
//     console.log("an error happened: " + err.message);
//   })
//   .save("./transcode.flv");
// // save to file

const folderName = randomUUID();
mkdirSync(folderName);

ffmpeg(fileStream)
  .audioCodec("libopus")
  .audioBitrate(96)
  .outputOptions([
    "-codec: copy",
    "-hls_time 10",
    // "-hls_playlist_type vod",
    // "-hls_base_url http://localhost:8080/",
    // `-map 0:v:0 -map 0:a:0 -map 0:v:0 -map 0:a:0 -map 0:v:0 -map 0:a:0`,
    `-hls_segment_filename ./${folderName}/%03d.ts`,
    // " -c:v libx264 -crf 22 -c:a aac -ar 48000",
    "-b:v:0 4000k -b:v:1 2000k -b:v:2 1000k -b:v:3 300k",
    // " -filter:v:0 scale=w=480:h=360  -maxrate:v:0 600k -b:a:0 500k",
    // "-filter:v:1 scale=w=640:h=480  -maxrate:v:1 1500k -b:a:1 1000k",
    // "-filter:v:2 scale=w=1280:h=720 -maxrate:v:2 3000k -b:a:2 2000k",
    // `-var_stream_map "v:0,a:0,name:360p v:1,a:1,name:480p v:2,a:2,name:720p"`,
    "-filter:v:0 scale=-2:1080 -filter:v:1 scale=-2:720 -filter:v:2 scale=-2:480 -filter:v:3 scale=-2:240",
    // "-map 0:v -map 0:v -map 0:v -map 0:v -map 0:a -map 0:a",
    // '-var_stream_map "v:0,a:0 v:1,a:0 v:2,a:0 v:3,a:1"',
    // `-preset fast -hls_list_size 10 -threads 0 -f hl`,
  ])
  .output(`./${folderName}/outputfile.m3u8`)
  .on("progress", function (progress) {
    console.log("Processing: " + JSON.stringify(progress) + "% done");
  })
  .on("end", function (err, stdout, stderr) {
    console.log("Finished processing!" /*, err, stdout, stderr*/);
    events.emit(uploadingEvent, folderName);
  })
  .run();

events.addListener(uploadingEvent, (folderName) => {
  uploadDir(path.resolve(folderName), BucketName);
});
async function uploadDir(s3Path: string, bucketName: string) {
  console.log("Started Uploading");
  async function getFiles(dir: string): Promise<string | string[]> {
    const dirents = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(
      dirents.map((dirent) => {
        const res = path.resolve(dir, dirent.name);
        return dirent.isDirectory() ? getFiles(res) : res;
      })
    );
    return Array.prototype.concat(...files);
  }

  const files = (await getFiles(s3Path)) as string[];
  try {
    for (const filePath of files) {
      await s3Client
        .putObject({
          Key: `${folderName}/${path.relative(s3Path, filePath)}`,
          Bucket: bucketName,
          Body: createReadStream(filePath),
        })
        .promise();
    }
    rmSync(folderName, { recursive: true, force: true });
  } catch {
    console.log("Failed To Upload");
  }
}
