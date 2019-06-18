import { Platform } from "react-native";

export const gradientColors = [
  "rgba(85,96,127,1.0)",
  "rgba(68, 79, 112, 1.0)",
  "rgba(48, 58, 87,1.0)"
];

export function outerContainer(width, height) {
  return {
    margin: 5,
    height: height,
    borderRadius: 20,
    width: width
  };
}

export default {
  innerContainer: {
    flex: 1,
    alignItems: "center",
    flexDirection: "row",
    alignContent: "center",
    alignSelf: "flex-start",
    justifyContent: "center"
  },
  shadowStyle: {
    ...Platform.select({
      ios: {
        shadowColor: "#595959",
        shadowOffset: {
          width: 1,
          height: 1
        },
        shadowRadius: 5,
        shadowOpacity: 0.5
      },
      android: {
        elevation: 3
      }
    })
  }
}