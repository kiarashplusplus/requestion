import React, { PureComponent } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  TouchableOpacity,
  View
} from "react-native";
import styles, { gradientColors, outerContainer } from "./Sticker.styles";
const { width } = Dimensions.get("window");
import { LinearGradient } from "expo";

const cardMargin = 10;

class Sticker extends PureComponent {
  constructor(props) {
    super(props);

    this.cardWidth = width * 0.95 - cardMargin;
    this.cardHeight =
      (this.props.imgHeight * this.cardWidth) / this.props.imgWidth;

    this.state = {
      isLoading: false,
      cardWidth: 1,
      cardHeight: 1
    };
  }
  onLoadEnd = () =>
    this.setState({
      isLoading: false,
      cardHeight: this.cardHeight,
      cardWidth: this.cardWidth
    });

  onPress = () => console.log("sticker pressed!");

  render() {
    return (
      <View style={styles.shadowStyle}>
        <TouchableOpacity onPress={this.onPress}>
          <LinearGradient
            start={[0, 0]}
            end={[1, 0]}
            colors={gradientColors}
            style={outerContainer(this.cardWidth, this.cardHeight)}
          >
            <View
              style={[
                styles.innerContainer,
                { flex: 1, paddingLeft: this.cardWidth / 2 - cardMargin }
              ]}
            >
              <ActivityIndicator animating={this.state.isLoading} />
            </View>
            <Image
              source={{
                uri: this.props.imgSrc,
                width: this.state.cardWidth,
                height: this.state.cardHeight
              }}
              onLoadStart={() => {
                this.setState({ isLoading: true });
              }}
              onLoadEnd={this.onLoadEnd}
            />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }
}

Sticker.defaultProps = {
  imgHeight: 250,
  imgWidth: 400
};

export default Sticker;
