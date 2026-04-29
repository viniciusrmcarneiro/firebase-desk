const workspaceRuntimePackages = [
  '@firebase-desk/data-format',
  '@firebase-desk/design-tokens',
  '@firebase-desk/hotkeys',
  '@firebase-desk/ipc-schemas',
  '@firebase-desk/product-ui',
  '@firebase-desk/repo-contracts',
  '@firebase-desk/repo-firebase',
  '@firebase-desk/repo-mocks',
  '@firebase-desk/script-runner',
  '@firebase-desk/ui',
];

const mainExternalizeDeps = {
  exclude: workspaceRuntimePackages,
  include: ['firebase-admin'],
};

export { mainExternalizeDeps, workspaceRuntimePackages };
