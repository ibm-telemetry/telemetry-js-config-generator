# IBM Telemetry Js Config Generator

Script automation for generating [@ibm/telemetry-js](https://github.com/ibm-telemetry/telemetry-js)
config files according to published schema.

Use this tool to automatically generate an
[@ibm/telemetry-js](https://github.com/ibm-telemetry/telemetry-js) compatible `telemetry.yml` file
with your project-specific configurations.

# Generating Config File

From the root of the project that needs to be instrumented with IBM Telemetry, run the
`telemetryconfig` command:

`npx ibmtelemetry-config --id sample-id --files ./src/components/**/*.(tsx|js|jsx)`

> Note that it is not necessary for your package to directly install this package as a dependency.
> Instead, use `npx` to call the published collection script directly from the
> `@ibm/telemetry-js-config-generator` package.

A `telemetry.yml` file will be generated inside the cwd path, unless a file path is specified (see
[--p, --file-path](#p---file-path)). Verify that the generated output is correct before using the
config file.

# Required Params

## --id

Unique identifier assigned on a per-project basis. See
[Onboarding a package to IBM Telemetry](https://github.com/ibm-telemetry/telemetry-js?tab=readme-ov-file#onboarding-a-package-to-ibm-telemetry).

`npx ibmtelemetry-config --id sample-id --endpoint https://example.com/v1/metrics --files ./src/components/**/*.(tsx|js|jsx)`

## --endpoint

URL of an OpenTelemetry-compatible metrics collector API endpoint. Used to post collected telemetry
data to.
`npx ibmtelemetry-config --id sample-id --endpoint https://example.com/v1/metrics --files ./src/components/**/*.(tsx|js|jsx)`

## -f, --files

Files to scan component props for (used to generate `allowedAttributeNames` and
`allowedAttributeStringValues` arrays in JSX scope config). Can be a space-separated list of files
or a glob.

> This parameter is only required when including JSX scope in telemetry config file (done by default
> unless opt-out, see [--no-jsx](#no-jsx)).

`npx ibmtelemetry-config --id sample-id --endpoint https://example.com/v1/metrics --files ./src/components/specific-component-1.tsx ./src/components/specific-component-2.jsx`

`npx ibmtelemetry-config --id sample-id --endpoint https://example.com/v1/metrics -f ./src/components/**/*.(tsx|js|jsx)`

# Optional Params

## -p, --file-path

Path to create config file at, defaults to `telemetry.yml`.

`npx ibmtelemetry-config --id sample-id --endpoint https://example.com/v1/metrics --files ./src/components/**/*.(tsx|js|jsx) --file-path ./packages/sample/telemetry.yml`

# -i, --ignore

Files to ignore when scanning for JSX Scope attributes, in glob(s) form.

`npx ibmtelemetry-config --id sample-id --endpoint https://example.com/v1/metrics -f ./src/components/**/*.(tsx|js|jsx) --ignore **/DataTable/*.tsx`

`npx ibmtelemetry-config --id sample-id --endpoint https://example.com/v1/metrics -f ./src/components/**/*.(tsx|js|jsx) -i **/DataTable/**/*.tsx **/Copy/**`

## --no-npm

Use this option to exclude npm scope config from generated telemetry config file.

`npx ibmtelemetry-config --id sample-id --endpoint https://example.com/v1/metrics --files ./src/components/**/*.(tsx|js|jsx) --no-npm`

## --no-jsx

Use this option to exclude JSX scope config from generated telemetry config file. Omit supplying the
`-f, --files` argument when option out of JSX config.

`npx ibmtelemetry-config --id sample-id --endpoint https://example.com/v1/metrics --no-jsx`
