module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          alias: {
            '@components': './src/components',
            '@screens': './src/screens',
            '@utils': './src/utils',
          },
        },
      ],
      ['module:react-native-dotenv'],
      'react-native-reanimated/plugin',
    ],
  };
};
