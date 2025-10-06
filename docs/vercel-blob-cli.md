# vercel blob

The `vercel blob` command is used to interact with [Vercel Blob](/docs/storage/vercel-blob) storage, providing functionality to upload, list, delete, and copy files, as well as manage Blob stores.

For more information about Vercel Blob, see the [Vercel Blob documentation](/docs/storage/vercel-blob) and [Vercel Blob SDK reference](/docs/storage/vercel-blob/using-blob-sdk).

## [Usage](#usage)

The `vercel blob` command supports the following operations:

- [`list`](#list-ls) - List all files in the Blob store
- [`put`](#put) - Upload a file to the Blob store
- [`del`](#del) - Delete a file from the Blob store
- [`copy`](#copy-cp) - Copy a file in the Blob store
- [`store add`](#store-add) - Add a new Blob store
- [`store remove`](#store-remove-rm) - Remove a Blob store
- [`store get`](#store-get) - Get a Blob store

For authentication, the CLI reads the `BLOB_READ_WRITE_TOKEN` value from your env file or you can use the [`--rw-token` option](#rw-token).

### [list (ls)](#list-ls)

```
vercel blob list
```

Using the `vercel blob list` command to list all files in the Blob store.

### [put](#put)

```
vercel blob put [path-to-file]
```

Using the `vercel blob put` command to upload a file to the Blob store.

### [del](#del)

```
vercel blob del [url-or-pathname]
```

Using the `vercel blob del` command to delete a file from the Blob store.

### [copy (cp)](#copy-cp)

```
vercel blob copy [from-url-or-pathname] [to-pathname]
```

Using the `vercel blob copy` command to copy a file in the Blob store.

### [store add](#store-add)

```
vercel blob store add [name] [--region <region>]
```

Using the `vercel blob store add` command to add a new Blob store. The default region is set to `iad1` when not specified.

### [store remove (rm)](#store-remove-rm)

```
vercel blob store remove [store-id]
```

Using the `vercel blob store remove` command to remove a Blob store.

### [store get](#store-get)

```
vercel blob store get [store-id]
```

Using the `vercel blob store get` command to get a Blob store.

## [Unique Options](#unique-options)

These are options that only apply to the `vercel blob` command.

### [Rw token](#rw-token)

You can use the `--rw-token` option to specify your Blob read-write token.

```
vercel blob put image.jpg --rw-token [rw-token]
```

Using the `vercel blob put` command with the `--rw-token` option.

### [Limit](#limit)

You can use the `--limit` option to specify the number of results to return per page when using `list`. The default value is `10` and the maximum is `1000`.

```
vercel blob list --limit 100
```

Using the `vercel blob list` command with the `--limit` option.

### [Cursor](#cursor)

You can use the `--cursor` option to specify the cursor from a previous page to start listing from.

```
vercel blob list --cursor [cursor-value]
```

Using the `vercel blob list` command with the `--cursor` option.

### [Prefix](#prefix)

You can use the `--prefix` option to filter Blobs by a specific prefix.

```
vercel blob list --prefix images/
```

Using the `vercel blob list` command with the `--prefix` option.

### [Mode](#mode)

You can use the `--mode` option to filter Blobs by either folded or expanded mode. The default is `expanded`.

```
vercel blob list --mode folded
```

Using the `vercel blob list` command with the `--mode` option.

### [Add Random Suffix](#add-random-suffix)

You can use the `--add-random-suffix` option to add a random suffix to the file name when using `put` or `copy`.

```
vercel blob put image.jpg --add-random-suffix
```

Using the `vercel blob put` command with the `--add-random-suffix` option.

### [Pathname](#pathname)

You can use the `--pathname` option to specify the pathname to upload the file to. The default is the filename.

```
vercel blob put image.jpg --pathname assets/images/hero.jpg
```

Using the `vercel blob put` command with the `--pathname` option.

### [Content Type](#content-type)

You can use the `--content-type` option to overwrite the content-type when using `put` or `copy`. It will be inferred from the file extension if not provided.

```
vercel blob put data.txt --content-type application/json
```

Using the `vercel blob put` command with the `--content-type` option.

### [Cache Control Max Age](#cache-control-max-age)

You can use the `--cache-control-max-age` option to set the `max-age` of the cache-control header directive when using `put` or `copy`. The default is `2592000` (30 days).

```
vercel blob put image.jpg --cache-control-max-age 86400
```

Using the `vercel blob put` command with the `--cache-control-max-age` option.

### [Force](#force)

You can use the `--force` option to overwrite the file if it already exists when uploading. The default is `false`.

```
vercel blob put image.jpg --force
```

Using the `vercel blob put` command with the `--force` option.

### [Multipart](#multipart)

You can use the `--multipart` option to upload the file in multiple small chunks for performance and reliability. The default is `true`.

```
vercel blob put large-file.zip --multipart false
```

Using the `vercel blob put` command with the `--multipart` option.

### [Region](#region)

You can use the `--region` option to specify the region where your Blob store should be created. The default is `iad1`. This option is only applicable when using the `store add` command.

```
vercel blob store add my-store --region sfo1
```

Using the `vercel blob store add` command with the `--region` option.

## [Global Options](#global-options)

The following [global options](/docs/cli/global-options) can be passed when using the `vercel blob` command:

- [`--cwd`](/docs/cli/global-options#current-working-directory)
- [`--debug`](/docs/cli/global-options#debug)
- [`--global-config`](/docs/cli/global-options#global-config)
- [`--help`](/docs/cli/global-options#help)
- [`--local-config`](/docs/cli/global-options#local-config)
- [`--no-color`](/docs/cli/global-options#no-color)
- [`--scope`](/docs/cli/global-options#scope)
- [`--token`](/docs/cli/global-options#token)

For more information on global options and their usage, refer to the [options section](/docs/cli/global-options).

Last updated on August 13, 2025
