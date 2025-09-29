// === CONFIGURABLE VARIABLES

const bpfoldername = "PixelPaint";
const useMinecraftPreview = false; // Whether to target the "Minecraft Preview" version of Minecraft vs. the main store version of Minecraft
const useMinecraftDedicatedServer = false; // Whether to use Bedrock Dedicated Server - see https://www.minecraft.net/download/server/bedrock
const dedicatedServerPath = "C:/mc/bds/1.19.0/"; // if using Bedrock Dedicated Server, where to find the extracted contents of the zip package

// === END CONFIGURABLE VARIABLES

const gulp = require("gulp");
const ts = require("gulp-typescript");
const del = require("del");
const os = require("os");
const spawn = require("child_process").spawn;
const sourcemaps = require("gulp-sourcemaps");
const replace = require("gulp-replace");
const fs = require("fs");
const path = require("path");


const worldsFolderName = useMinecraftDedicatedServer ? "worlds" : "minecraftWorlds";

const activeWorldFolderName = useMinecraftDedicatedServer ? "Bedrock level" : bpfoldername + "world";

const mcdir = useMinecraftDedicatedServer
  ? dedicatedServerPath
  : os.homedir() +
    (useMinecraftPreview
      ? "/AppData/Local/Packages/Microsoft.MinecraftWindowsBeta_8wekyb3d8bbwe/LocalState/games/com.mojang/"
      : "/AppData/Local/Packages/Microsoft.MinecraftUWP_8wekyb3d8bbwe/LocalState/games/com.mojang/");

function clean_build(callbackFunction) {
  del(["build/behavior_packs/", "build/resource_packs/"]).then(
    (value) => {
      callbackFunction(); // success
    },
    (reason) => {
      callbackFunction(); // error
    }
  );
}

function copy_behavior_packs() {
  return gulp.src(["behavior_packs/**/*"]).pipe(gulp.dest("build/behavior_packs"));
}

function copy_resource_packs() {
  return gulp.src(["resource_packs/**/*"]).pipe(gulp.dest("build/resource_packs"));
}

const copy_content = gulp.parallel(copy_behavior_packs, copy_resource_packs);

const placeholderConfig = JSON.parse(fs.readFileSync("definitions/placeholders.json"));

function replace_placeholders_build(done) {
  const paths = [
    { path: "build/behavior_packs/" + bpfoldername, extensions: ["json", "js", "lang"] },
    { path: "build/resource_packs/" + bpfoldername, extensions: ["json", "js", "lang"] },
    // Add more paths and extensions as needed
  ];

  // Clear the require cache for definitions/placeholders.json to force a reload
  delete require.cache[require.resolve("./definitions/placeholders.json")];

  // Reload the placeholders configuration
  const placeholders = require("./definitions/placeholders.json");

  const prependNamespace = (object) => {
    const namespace = placeholders.NAMESPACE;
    return Object.keys(object).reduce((acc, key) => {
      acc[key] = namespace + ":" + object[key];
      return acc;
    }, {});
  };

  const configs = {
    PROPERTY: prependNamespace(placeholders.PROPERTY),
    ENUM: placeholders.ENUM,
    EVENT: prependNamespace(placeholders.EVENT),
    S_EVENT: prependNamespace(placeholders.S_EVENT),
    TEXT: prependNamespace(placeholders.TEXT),
    FAMILY: prependNamespace(placeholders.FAMILY),
    ITEM: prependNamespace(placeholders.ITEM),
    ITEM_COMPONENT: prependNamespace(placeholders.ITEM_COMPONENT),
    ENTITY: prependNamespace(placeholders.ENTITY),
    PARTICLE: prependNamespace(placeholders.PARTICLE),
    NAMESPACE: placeholders.NAMESPACE,
  };

  let streams = [];
  // Loop over each path and extension to replace placeholders
  paths.forEach((item) => {
    item.extensions.forEach((ext) => {
      // Collect the stream in an array to ensure all streams are completed
      let stream = gulp
        .src(`${item.path}/**/*.${ext}`, { base: `./${item.path}` })
        .pipe(replace(/PROPERTY\(([^)]+)\)/g, (match, p1) => configs.PROPERTY[p1] || p1))
        .pipe(replace(/ENUM\(([^)]+)\)/g, (match, p1) => configs.ENUM[p1] || p1))
        .pipe(replace(/S_EVENT\(([^)]+)\)/g, (match, p1) => configs.S_EVENT[p1] || p1))
        .pipe(replace(/ITEM_COMPONENT\(([^)]+)\)/g, (match, p1) => configs.ITEM_COMPONENT[p1] || p1))
        .pipe(replace(/EVENT\(([^)]+)\)/g, (match, p1) => configs.EVENT[p1] || p1))
        .pipe(replace(/TEXT\(([^)]+)\)/g, (match, p1) => configs.TEXT[p1] || p1))
        .pipe(replace(/FAMILY\(([^)]+)\)/g, (match, p1) => configs.FAMILY[p1] || p1))
        .pipe(replace(/ITEM\(([^)]+)\)/g, (match, p1) => configs.ITEM[p1] || p1))
        .pipe(replace(/ENTITY\(([^)]+)\)/g, (match, p1) => configs.ENTITY[p1] || p1))
        .pipe(replace(/PARTICLE\(([^)]+)\)/g, (match, p1) => configs.PARTICLE[p1] || p1))
        .pipe(replace(/NAMESPACE/g, configs.NAMESPACE))
        .pipe(gulp.dest(`./${item.path}`)) // Writes back to the respective directory
        .on("data", function (file) {
          //console.log(`Processed file: ${file.path}`);
        });

      streams.push(stream);
    });
  });

  // Merge all streams to ensure all streams are completed before calling done
  return require("merge-stream")(...streams).on("end", done);
}

function createVscodeSnippets(done) {
  const placeholders = JSON.parse(fs.readFileSync("definitions/placeholders.json"));

  const snippets = {};
  for (const [category, items] of Object.entries(placeholders)) {
    if (category === "NAMESPACE") continue; // Skip the NAMESPACE key

    for (const key of Object.keys(items)) {
      const snippetKey = `${category}(${key})`;
      snippets[snippetKey] = {
        prefix: snippetKey,
        body: snippetKey,
        description: `Insert ${snippetKey}`,
      };
    }
  }

  const snippetsFilePath = path.join(__dirname, ".vscode", "placeholders.code-snippets");
  fs.writeFile(snippetsFilePath, JSON.stringify(snippets, null, 2), (err) => {
    if (err) {
      console.error("Failed to write snippets:", err);
      done(err); // Signal Gulp that an error occurred
    } else {
      console.log("VSCode snippets have been generated successfully!");
      done(); // Signal Gulp that the task is done
    }
  });
}

gulp.task("create-vscode-snippets", createVscodeSnippets);

function compile_scripts() {
  return gulp
    .src("scripts/**/*.ts")
    .pipe(sourcemaps.init())
    .pipe(
      ts({
        module: "es2020",
        moduleResolution: "node",
        lib: ["es2020", "dom"],
        strict: true,
        target: "es2020",
        noImplicitAny: true,
      })
    )
    .pipe(
      sourcemaps.write("../../_" + bpfoldername + "Debug", {
        destPath: bpfoldername + "/scripts/",
        sourceRoot: "./../../../scripts/",
      })
    )
    .pipe(gulp.dest("build/behavior_packs/" + bpfoldername + "/scripts"));
}

const build = gulp.series(clean_build, copy_content, compile_scripts, replace_placeholders_build, createVscodeSnippets);

function clean_localmc(callbackFunction) {
  if (!bpfoldername || !bpfoldername.length || bpfoldername.length < 2) {
    console.log("No bpfoldername specified.");
    callbackFunction();
    return;
  }

  del([mcdir + "development_behavior_packs/" + bpfoldername, mcdir + "development_resource_packs/" + bpfoldername], {
    force: true,
  }).then(
    (value) => {
      callbackFunction(); // Success
    },
    (reason) => {
      callbackFunction(); // Error
    }
  );
}

function deploy_localmc_behavior_packs() {
  console.log("Deploying to '" + mcdir + "development_behavior_packs/" + bpfoldername + "'");
  return gulp
    .src(["build/behavior_packs/" + bpfoldername + "/**/*"])
    .pipe(gulp.dest(mcdir + "development_behavior_packs/" + bpfoldername));
}

function deploy_localmc_resource_packs() {
  return gulp
    .src(["build/resource_packs/" + bpfoldername + "/**/*"])
    .pipe(gulp.dest(mcdir + "development_resource_packs/" + bpfoldername));
}

function getTargetWorldPath() {
  return mcdir + worldsFolderName + "/" + activeWorldFolderName;
}

function getTargetConfigPath() {
  return mcdir + "config";
}

function getTargetWorldBackupPath() {
  return "backups/worlds/" + activeWorldFolderName;
}

function getDevConfigPath() {
  return "config";
}

function getDevWorldPath() {
  return "worlds/default";
}

function getDevWorldBackupPath() {
  return "backups/worlds/devdefault";
}

function clean_localmc_world(callbackFunction) {
  console.log("Removing '" + getTargetWorldPath() + "'");

  del([getTargetWorldPath()], {
    force: true,
  }).then(
    (value) => {
      callbackFunction(); // Success
    },
    (reason) => {
      callbackFunction(); // Error
    }
  );
}

function clean_localmc_config(callbackFunction) {
  console.log("Removing '" + getTargetConfigPath() + "'");

  del([getTargetConfigPath()], {
    force: true,
  }).then(
    (value) => {
      callbackFunction(); // Success
    },
    (reason) => {
      callbackFunction(); // Error
    }
  );
}

function clean_dev_world(callbackFunction) {
  console.log("Removing '" + getDevWorldPath() + "'");

  del([getDevWorldPath()], {
    force: true,
  }).then(
    (value) => {
      callbackFunction(); // Success
    },
    (reason) => {
      callbackFunction(); // Error
    }
  );
}

function clean_localmc_world_backup(callbackFunction) {
  console.log("Removing backup'" + getTargetWorldBackupPath() + "'");

  del([getTargetWorldBackupPath()], {
    force: true,
  }).then(
    (value) => {
      callbackFunction(); // Success
    },
    (reason) => {
      callbackFunction(); // Error
    }
  );
}

function clean_dev_world_backup(callbackFunction) {
  console.log("Removing backup'" + getDevWorldBackupPath() + "'");

  del([getTargetWorldBackupPath()], {
    force: true,
  }).then(
    (value) => {
      callbackFunction(); // Success
    },
    (reason) => {
      callbackFunction(); // Error
    }
  );
}

function backup_dev_world() {
  console.log("Copying world '" + getDevWorldPath() + "' to '" + getDevWorldBackupPath() + "'");
  return gulp
    .src([getTargetWorldPath() + "/**/*"])
    .pipe(gulp.dest(getDevWorldBackupPath() + "/worlds/" + activeWorldFolderName));
}

function deploy_localmc_config() {
  console.log("Copying world 'config/' to '" + getTargetConfigPath() + "'");
  return gulp.src([getDevConfigPath() + "/**/*"]).pipe(gulp.dest(getTargetConfigPath()));
}

function deploy_localmc_world() {
  console.log("Copying world 'worlds/default/' to '" + getTargetWorldPath() + "'");
  return gulp.src([getDevWorldPath() + "/**/*"]).pipe(gulp.dest(getTargetWorldPath()));
}

function ingest_localmc_world() {
  console.log("Ingesting world '" + getTargetWorldPath() + "' to '" + getDevWorldPath() + "'");
  return gulp.src([getTargetWorldPath() + "/**/*"]).pipe(gulp.dest(getDevWorldPath()));
}

function backup_localmc_world() {
  console.log("Copying world '" + getTargetWorldPath() + "' to '" + getTargetWorldBackupPath() + "/'");
  return gulp
    .src([getTargetWorldPath() + "/**/*"])
    .pipe(gulp.dest(getTargetWorldBackupPath() + "/" + activeWorldFolderName));
}

const deploy_localmc = gulp.series(
  clean_localmc,
  function (callbackFunction) {
    callbackFunction();
  },
  gulp.parallel(deploy_localmc_behavior_packs, deploy_localmc_resource_packs)
);

function watch() {
  return gulp.watch(
    ["scripts/**/*.ts", "behavior_packs/**/*", "resource_packs/**/*", "definitions/placeholders.json"],
    gulp.series(build, deploy_localmc)
  );
}

function serve() {
  return gulp.watch(
    ["scripts/**/*.ts", "behavior_packs/**/*", "resource_packs/**/*", "definitions/placeholders.json"],
    gulp.series(stopServer, build, deploy_localmc, startServer)
  );
}

let activeServer = null;

function stopServer(callbackFunction) {
  if (activeServer) {
    activeServer.stdin.write("stop\n");
    activeServer = null;
  }

  callbackFunction();
}

function startServer(callbackFunction) {
  if (activeServer) {
    activeServer.stdin.write("stop\n");
    activeServer = null;
  }

  activeServer = spawn(dedicatedServerPath + "bedrock_server");

  let logBuffer = "";

  let serverLogger = function (buffer) {
    let incomingBuffer = buffer.toString();

    if (incomingBuffer.endsWith("\n")) {
      (logBuffer + incomingBuffer).split(/\n/).forEach(function (message) {
        if (message) {
          if (message.indexOf("Server started.") >= 0) {
            activeServer.stdin.write("script debugger listen 19144\n");
          }
          console.log("Server: " + message);
        }
      });
      logBuffer = "";
    } else {
      logBuffer += incomingBuffer;
    }
  };

  activeServer.stdout.on("data", serverLogger);
  activeServer.stderr.on("data", serverLogger);

  callbackFunction();
}

exports.createVscodeSnippets = createVscodeSnippets;
exports.replace_placeholders_build = replace_placeholders_build;
exports.clean_build = clean_build;
exports.copy_behavior_packs = copy_behavior_packs;
exports.copy_resource_packs = copy_resource_packs;
exports.compile_scripts = compile_scripts;
exports.copy_content = copy_content;
exports.build = build;
exports.clean_localmc = clean_localmc;
exports.deploy_localmc = deploy_localmc;
exports.default = gulp.series(build, deploy_localmc);
exports.clean = gulp.series(clean_build, clean_localmc);
exports.watch = gulp.series(build, deploy_localmc, watch);
exports.serve = gulp.series(build, deploy_localmc, startServer, serve);
exports.updateworld = gulp.series(
  clean_localmc_world_backup,
  backup_localmc_world,
  clean_localmc_world,
  deploy_localmc_world
);
exports.ingestworld = gulp.series(clean_dev_world_backup, backup_dev_world, clean_dev_world, ingest_localmc_world);
exports.updateconfig = gulp.series(clean_localmc_config, deploy_localmc_config);
