# IBM Telemetry Js Config Generator

Script automation for generating [@ibm/telemetry-js](https://github.com/ibm-telemetry/telemetry-js)
config files according to published schema.

Use this tool to automatically generate an
[@ibm/telemetry-js](https://github.com/ibm-telemetry/telemetry-js) compatible `telemetry.yml` file
with your project-specific configurations.

> **Note**  
> For v1, please see [v1 docs](https://github.com/ibm-telemetry/telemetry-js-config-generator/tree/v1.0.3?tab=readme-ov-file#ibm-telemetry-js-config-generator)

## Generating Config File

From the root of the project that needs to be instrumented with IBM Telemetry, run the `generate`
command:

`npx -y @ibm/telemetry-js-config-generator generate --id sample-id --endpoint https://example.com/v1/metrics --files ./src/components/**/*.(tsx|js|jsx)`

> Note that it is not necessary for your package to directly install this package as a dependency.
> Instead, use `npx` to call the published collection script directly from the
> `@ibm/telemetry-js-config-generator` package.

Alternatively, if you decide to install the package as a dependency (to run it periodically within
your CI environment, for example), you can call the bin like so:

`ibmtelemetry-config generate --id sample-id --endpoint https://example.com/v1/metrics --files ./src/components/**/*.(tsx|js|jsx)`

A `telemetry.yml` file will be generated inside the cwd path, unless a file path is specified (see
parameters). Verify that the generated output is correct before using the config file.

### Parameters

| Param     | Usage               | Description                                                                                                                                                                                             | Required                                                                                                           | Type             | Default           |
| --------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------- | ----------------- |
| id        | `--id`              | Unique identifier assigned on a per-project basis. See [Onboarding a package to IBM Telemetry](https://github.com/ibm-telemetry/telemetry-js?tab=readme-ov-file#onboarding-a-package-to-ibm-telemetry). | Required                                                                                                           | String           | -                 |
| endpoint  | `--endpoint`        | URL of an OpenTelemetry-compatible metrics collector API endpoint. Used to post collected telemetry data to.                                                                                            | Required                                                                                                           | String           | -                 |
| files     | `-f`, `--files`     | Files to scan component props for (used to generate `allowedAttributeNames` and `allowedAttributeStringValues` arrays in JSX scope config). Can be a space-separated list of files or a glob.           | Required when including JSX scope in telemetry config file (done by default unless opt-out, see `--no-jsx` param). | String[], String | -                 |
| file path | `-p`, `--file-path` | Path to create config file at.                                                                                                                                                                          | Optional                                                                                                           | String           | `./telemetry.yml` |
| ignore    | `-i`, `--ignore`    | Files to ignore when scanning for JSX Scope attributes, in glob(s) form.                                                                                                                                | Optional                                                                                                           | String[], String | -                 |
| no npm    | `--no-npm`          | Use this option to exclude `npm` scope config from generated telemetry config file.                                                                                                                     | Optional                                                                                                           | param only       | -                 |
| no jsx    | `--no-jsx`          | Use this option to exclude `JSX` scope config from generated telemetry config file. Omit supplying the `-f, --files` and `-i, --ignore` arguments when opting out of JSX config.                        | Optional                                                                                                           | param only       | -                 |
| no js     | `--no-js`           | Use this option to exclude `js` scope config from generated telemetry config file.                                                                                                                      | Optional                                                                                                           | param only       | -                 |

### Example Usage

`npx -y @ibm/telemetry-js-config-generator generate --id sample-id --endpoint https://example.com/v1/metrics --files ./src/components/**/*.(tsx|js|jsx) --file-path ./packages/sample/telemetry.yml -i **/DataTable/**/*.tsx **/Copy/** --no-npm --no-js`

`ibmtelemetry-config generate --id sample-id --endpoint https://example.com/v1/metrics --no-jsx`

## Updating existing config file

To update an existing telemetry config file, run the `update` command. You can use this command to
regenerate entirely a telemetry configuration or only in-part (see available parameters). Remember
to supply the `file path` parameter if your telemetry config is not at the default location.

### Parameters

| Param     | Usage               | Description                                                                                                                                                                                                                                                                                                     | Required                                                                                        | Type             | Default           |
| --------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------- | ----------------- |
| id        | `--id`              | Unique identifier assigned on a per-project basis. See [Onboarding a package to IBM Telemetry](https://github.com/ibm-telemetry/telemetry-js?tab=readme-ov-file#onboarding-a-package-to-ibm-telemetry). Supplying this optional parameter will overwrite the current `id` set in the existing telemetry config. | Optional                                                                                        | String           | -                 |
| endpoint  | `--endpoint`        | URL of an OpenTelemetry-compatible metrics collector API endpoint. Used to post collected telemetry data to. Supplying this optional parameter will overwrite the current `endpoint` set in the existing telemetry config.                                                                                      | Optional                                                                                        | String           | -                 |
| files     | `-f`, `--files`     | Files to scan component props for (used to generate `allowedAttributeNames` and `allowedAttributeStringValues` arrays in JSX scope config). Can be a space-separated list of files or a glob.                                                                                                                   | Optional. If this parameter is not specified, the `jsx` scope will **not** be regenerated.      | String[], String | -                 |
| file path | `-p`, `--file-path` | Path to read and write config file at. Should be the path to the existing config file.                                                                                                                                                                                                                          | Optional. Program will try to read the current config file from `'./telemetry.yml'` if omitted. | String           | `./telemetry.yml` |
| ignore    | `-i`, `--ignore`    | Files to ignore when scanning for JSX Scope attributes, in glob(s) form.                                                                                                                                                                                                                                        | Optional                                                                                        | String[], String | -                 |
| no npm    | `--no-npm`          | Use this option to bypass updating `npm` scope config. Note that an existing npm configuration will not be removed by using this option.                                                                                                                                                                        | Optional                                                                                        | param only       | -                 |
| no jsx    | `--no-jsx`          | Use this option to bypass updating `jsx` scope config. Note that an existing jsx configuration will not be removed by using this option. Omit supplying the `-f, --files` and `-i, --ignore` arguments when opting out of JSX config.                                                                           | Optional                                                                                        | param only       | -                 |
| no js     | `--no-js`           | Use this option to bypass updating `js` scope config. Note that an existing js configuration will not be removed by using this option.                                                                                                                                                                          | Optional                                                                                        | param only       | -                 |

### Example Usage

`npx -y @ibm/telemetry-js-config-generator update --files ./src/components/**/*.(tsx|js|jsx)`

`ibmtelemetry-config update --no-jsx`

## Adding, removing and updating scopes

You may add, update or remove scopes from an existing telemetry configuration file by using the
scope specific commands:

### npm

Use `npm` command along with `add`, `update` or `remove` subcommands. Remember to supply the
`file path` parameter if your telemetry config is not at the default location.

#### Parameters

| Param     | Command                                                   | Usage               | Description                                                                            | Required                                                                                        | Type   | Default           |
| --------- | --------------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------ | ----------------- |
| file path | <ul><li>`add`</li><li>`update`</li><li>`remove`</li></ul> | `-p`, `--file-path` | Path to read and write config file at. Should be the path to the existing config file. | Optional. Program will try to read the current config file from `'./telemetry.yml'` if omitted. | String | `./telemetry.yml` |

#### Example Usage

`npx -y @ibm/telemetry-js-config-generator npm add`

`ibmtelemetry-config npm update`

`npx -y @ibm/telemetry-js-config-generator npm remove`

### jsx

Use `jsx` command along with `add`, `update` or `remove` subcommands. Remember to supply the
`file path` parameter if your telemetry config is not at the default location.

#### Parameters

| Param     | Command                                                   | Usage               | Description                                                                                                                                                                                   | Required                                                                                        | Type             | Default           |
| --------- | --------------------------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------- | ----------------- |
| file path | <ul><li>`add`</li><li>`update`</li><li>`remove`</li></ul> | `-p`, `--file-path` | Path to read and write config file at. Should be the path to the existing config file.                                                                                                        | Optional. Program will try to read the current config file from `'./telemetry.yml'` if omitted. | String           | `./telemetry.yml` |
| files     | <ul><li>`add`</li><li>`update`</li></ul>                  | `-f`, `--files`     | Files to scan component props for (used to generate `allowedAttributeNames` and `allowedAttributeStringValues` arrays in JSX scope config). Can be a space-separated list of files or a glob. | Required                                                                                        | String[], String | -                 |
| ignore    | <ul><li>`add`</li><li>`update`</li><li>`remove`</li></ul> | `-i`, `--ignore`    | Files to ignore when scanning for JSX Scope attributes, in glob(s) form.                                                                                                                      | Optional                                                                                        | String[], String | -                 |

#### Example Usage

`npx -y @ibm/telemetry-js-config-generator jsx add -f ./src/components/**/*.(tsx|js|jsx) --ignore **/DataTable/**/*.tsx **/Copy/**`

`ibmtelemetry-config jsx update --files ./src/components/**/*.(tsx|js|jsx)`

`npx -y @ibm/telemetry-js-config-generator jsx remove`

### js

Use `js` command along with `add`, `update` or `remove` subcommands. Remember to supply the
`file path` parameter if your telemetry config is not at the default location.

#### Parameters

| Param     | Command                                                   | Usage               | Description                                                                            | Required                                                                                        | Type   | Default           |
| --------- | --------------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------ | ----------------- |
| file path | <ul><li>`add`</li><li>`update`</li><li>`remove`</li></ul> | `-p`, `--file-path` | Path to read and write config file at. Should be the path to the existing config file. | Optional. Program will try to read the current config file from `'./telemetry.yml'` if omitted. | String | `./telemetry.yml` |

#### Example Usage

`npx -y @ibm/telemetry-js-config-generator js add`

`ibmtelemetry-config js update`

`npx -y @ibm/telemetry-js-config-generator js remove`
