## Objective

Use this API to read from and write to files in the user profile folder. Until Mozilla has made a final decision about including the [Chrome FileSystem API](https://web.dev/file-system-access/), this API can be used as an interim solution.

**Note: Currently does not work with TB78.**

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
