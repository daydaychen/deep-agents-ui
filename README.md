# 🚀🧠 Databus Pilot UI



## 🚀 Quickstart

**Install dependencies and run the app**

```bash
$ git clone https://github.com/langchain-ai/deep-agents-ui.git
$ cd deep-agents-ui
$ yarn install
$ yarn dev
```

**Connect to your LangGraph deployment**

You can get the Deployment URL and Assistant ID from the terminal output and `langgraph.json` file, respectively:

- Deployment URL: http://127.0.1:2024
- Assistant ID: `research`

**Open the UI** at [http://localhost:3000](http://localhost:3000) and input the Deployment URL and Assistant ID:
As the agent runs, you can see its files in LangGraph state.

- **Deployment URL**: The URL for the LangGraph deployment you are connecting to
- **Assistant ID**: The ID of the assistant or agent you want to use

**Usage**

You can interact with the deployment via the chat interface and can edit settings at any time by clicking on the Settings button in the header.

<img width="2039" height="1495" alt="Screenshot 2025-11-17 at 1 11 27 PM" src="https://github.com/user-attachments/assets/50e1b5f3-a626-4461-9ad9-90347e471e8c" />

As the agent runs, you can see its files in LangGraph state.

<img width="2039" height="1495" alt="Screenshot 2025-11-17 at 1 11 36 PM" src="https://github.com/user-attachments/assets/86cc6228-5414-4cf0-90f5-d206d30c005e" />

You can click on any file to view it.

<img width="2039" height="1495" alt="Screenshot 2025-11-17 at 1 11 40 PM" src="https://github.com/user-attachments/assets/9883677f-e365-428d-b941-992bdbfa79dd" />

### Usage

You can run your Databus Pilot in Debug Mode, which will execute the agent step by step. This will allow you to re-run the specific steps of the agent. This is intended to be used alongside the optimizer.

You can also turn off Debug Mode to run the full agent end-to-end.

### Message Retry and Branching

The application supports message-level retry using LangChain's checkpoint mechanism:

- **Retry from Checkpoint**: Click the "Retry from here" button on any AI message to re-execute the agent from that point
- **Branching Support**: When you retry from a checkpoint, you can create alternate execution paths (branches)
- **Branch Display**: Messages show which branch they belong to when not on the main branch
- **Checkpoint Persistence**: Each message's checkpoint is stored, allowing you to go back to any point in the conversation

This feature is useful for:

- Testing different agent responses to the same prompt
- Recovering from errors by retrying from a previous checkpoint
- Exploring alternate execution paths without losing the original conversation
- Debugging agent behavior at specific points in the execution
