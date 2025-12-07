// domains/fitness.js
// Day 1: skeleton for the Fitness domain (no heavy logic yet)

/**
 * Handle fitness-related commands.
 *
 * context = {
 *   command: string,
 *   userId: string,
 *   payload: any,
 *   app: ExpressApp
 * }
 */
async function handleFitnessCommand(context) {
  const { command /*, userId, payload, app */ } = context;

  // For Day 1, we only acknowledge the command exists.
  // The full logic will be filled on later days.

  switch (command) {
    case "fitness.startSession":
      // TODO: implement in Day 2/3
      return {
        ok: true,
        message: "fitness.startSession received (skeleton only - Day 1)"
      };

    case "fitness.repUpdate":
      // TODO: implement in Day 2/3
      return {
        ok: true,
        message: "fitness.repUpdate received (skeleton only - Day 1)"
      };

    case "fitness.endSession":
      // TODO: implement in Day 2/3
      return {
        ok: true,
        message: "fitness.endSession received (skeleton only - Day 1)"
      };

    default:
      throw new Error("Unknown fitness command: " + command);
  }
}

module.exports = {
  handleFitnessCommand
};
