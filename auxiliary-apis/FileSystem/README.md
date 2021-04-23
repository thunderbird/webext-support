## Objective

Use this API to read from and write to files in the users profile folder. As long as Mozilla has not made a final descission on including the [Chrome FileSystem API](https://web.dev/file-system-access/), this API can be used as an intermediate sollution.

## Usage

The API is using the following folder for file access:

```
<profile-folder>/FileSystemAPI/<add-on-id>/
```

The API provides two simple functions to read/write UTF-8 encoded text files:

### async readFile(filename)

Returns a Promise for the file content. Throws if the file does not exist. 


### async writeFile(filename, data)

Returns a Promise which will resolve when the provided `data` has been written.
