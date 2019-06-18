import React, { Component } from "react";
import {
  ActivityIndicator,
  CameraRoll,
  Dimensions,
  Image,
  Linking,
  Share,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from "react-native";
import styles, { gradientColors, outerContainer } from "./Sticker.styles";
const { width, height } = Dimensions.get("window");
import { LinearGradient } from "expo-linear-gradient";

const cardMargin = 10;
const instagramUrl =
  "instagram://library?InstagramCaption=Requestion.app&AssetPath=%@";

class Sticker extends Component {
  _isMounted = false;

  constructor(props) {
    super(props);

    // Bound to 0.9 width X 0.7 height
    this.cardWidth = width * 0.9;
    this.cardHeight =
      (this.props.imgHeight * this.cardWidth) / this.props.imgWidth;
    if (this.cardHeight > height * 0.7) {
      this.cardHeight = height * 0.7;
      this.cardWidth =
        (this.props.imgWidth * this.cardHeight) / this.props.imgHeight;
    }

    this.state = {
      isLoading: false,
      cardWidth: 1,
      cardHeight: 1
    };
  }

  componentWillUnmount = () => (this._isMounted = false);

  componentDidMount() {
    this._isMounted = true;
    if (this.props.base64) {
      console.log("Base64 from props. Not fetching :)");
      this.setState({
        base64: this.props.base64
      });
    } else {
      this.setState({
        isLoading: true
      });

      fetch(this.props.imgSrc)
        .then(response => response.json())
        .then(responseJson => {
          console.log(`Fetched ${responseJson.stickerId}`);
          if (this._isMounted) {
            this.setState({
              base64: responseJson.image,
              isLoading: false
            });
          }
        })
        .catch(error => {
          console.error(error);
        });
    }
  }

  onLoadEnd = () =>
    this.setState({
      isLoading: false,
      cardHeight: this.cardHeight,
      cardWidth: this.cardWidth
    });

  onShare = async (type = "default") => {
    console.log("onShare is pressed!");
    if (type == "ig") {
      await CameraRoll.saveToCameraRoll(this.state.base64, "photo");
      // const link = instagramUrl + encodeURIComponent(this.state.base64.split("data:image/jpeg;base64,")[1]);
      return Linking.openURL(instagramUrl);
    } else {
      try {
        const result = await Share.share(
          {
            message: this.props.imgSrc + "&html=true",
            title: "Requestion",
            url: this.state.base64
          },
          {
            excludedActivityTypes: [
              "com.apple.UIKit.activity.PostToWeibo",
              "com.apple.UIKit.activity.Print",
              "com.apple.UIKit.activity.AssignToContact",
              "com.apple.UIKit.activity.AddToReadingList",
              "com.apple.UIKit.activity.PostToFlickr",
              "com.apple.UIKit.activity.PostToVimeo",
              "com.apple.UIKit.activity.PostToTencentWeibo",
              "com.apple.UIKit.activity.OpenInIBooks",
              "com.apple.UIKit.activity.MarkupAsPDF",
              "com.apple.reminders.RemindersEditorExtension",
              "com.apple.mobileslideshow.StreamShareService",
              "pinterest.ShareExtension",
              "com.google.GooglePlus.ShareExtension",
              "com.tumblr.tumblr.Share-With-Tumblr"
            ]
          }
        );
        if (result.action === Share.sharedAction) {
          if (result.activityType) {
            // shared with activity type of result.activityType
          } else {
            // shared
          }
        } else if (result.action === Share.dismissedAction) {
          // dismissed
        }
      } catch (error) {
        alert(error.message);
      }
    }
  };

  renderSticker() {
    return (
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
        {this.state.base64 && (
          <Image
            source={{
              uri: this.state.base64,
              width: this.state.cardWidth,
              height: this.state.cardHeight
            }}
            onLoadStart={() => {
              this.setState({ isLoading: true });
            }}
            onLoadEnd={this.onLoadEnd}
          />
        )}
      </LinearGradient>
    );
  }

  render() {
    return (
      <View style={styles.shadowStyle}>
        {this.props.openDetails ? (
          <TouchableOpacity
            onPress={() =>
              this.props.openDetails({
                base64: this.state.base64,
                ...this.props
              })
            }
          >
            {this.renderSticker()}
          </TouchableOpacity>
        ) : (
          <TouchableWithoutFeedback>
            {this.renderSticker()}
          </TouchableWithoutFeedback>
        )}
      </View>
    );
  }
}

Sticker.defaultProps = {
  imgHeight: 250,
  imgWidth: 400
};

export default Sticker;
