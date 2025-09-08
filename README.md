# Debate Application

This is a 1v1 debate application that utilizes a Large Language Model (LLM) as a judge to enforce strict word caps on arguments and provide valid JSON results based on the debate submissions.

## Project Structure

```
debate-app
├── src
│   ├── app.ts               # Entry point of the application
│   ├── judge
│   │   └── llmJudge.ts      # LLM Judge implementation
│   ├── debate
│   │   └── debateManager.ts  # Debate management logic
│   ├── utils
│   │   └── wordCap.ts       # Utility for enforcing word caps
│   └── types
│       └── index.ts         # Type definitions
├── package.json              # NPM configuration
├── tsconfig.json             # TypeScript configuration
└── README.md                 # Project documentation
```

## Features

- **Debate Management**: The application manages the flow of a 1v1 debate, allowing each participant to submit their arguments.
- **Word Cap Enforcement**: Each argument is subject to a strict word limit, ensuring concise submissions.
- **LLM Judging**: An LLM judge evaluates the debate based on the provided arguments and outputs a structured JSON result.

## Setup Instructions

1. Clone the repository:
   ```
   git clone <repository-url>
   cd debate-app
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Compile the TypeScript files:
   ```
   npm run build
   ```

4. Start the application:
   ```
   npm start
   ```

## Usage Guidelines

- Each participant submits their argument through the designated endpoint.
- The LLM judge will evaluate the arguments and return a JSON result indicating the outcome of the debate.
- Ensure that your arguments adhere to the specified word limits to avoid truncation.

## Contributing

Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.