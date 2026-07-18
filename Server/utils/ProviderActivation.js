export const isProviderActive = (provider) => {
    if (!provider) return false;
    // Check if the provider is active, not banned, and has completed profile setup
    if (provider.isActive === true &&
        provider.isBanned !== true &&
        provider.sandboxBankAccount?.isSetupComplete === true) return true;
    return false;
};

export const activeProviderFilter = () => ({
    isActive: true,
    isBanned: { $ne: true }
});
