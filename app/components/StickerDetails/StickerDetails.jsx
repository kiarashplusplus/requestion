import React, { PureComponent } from "react";
import {
  ActivityIndicator,
  TouchableOpacity,
  Text,
  Image,
  View,
  ImageBackground,
  Platform
} from "react-native";
import Sticker from "../Sticker";
import Icon from "react-native-dynamic-vector-icons";
var _ = require("lodash");
import { WebBrowser } from "expo";

const controllBottom = 0;

const requestionAlternatives = id =>
  fetch("https://requestion.app/alternatives/?id=" + id)
    .then(response => {
      if (!response.ok) {
        return [];
      }
      return response.json();
    })
    .then(responseJson => {
      return responseJson.stickers;
    })
    .catch(error => {
      console.error(error);
      return [];
    });

export default class StickerDetails extends PureComponent {
  _isMounted = false;

  constructor(props) {
    super(props);
    this.sticker = React.createRef();

    // sticker from props. later can be updated with alternatives button
    this.initialImage = {
      imgSrc: this.props.stickerDetails.imgSrc,
      imgHeight: this.props.stickerDetails.imgHeight,
      imgWidth: this.props.stickerDetails.imgWidth,
      base64: this.props.stickerDetails.base64
    };
    this.alternatives = [this.initialImage];

    this.state = {
      ...this.initialImage,
      image: true,
      hasError: false,
      isLoading: false,
      isAlternatives: false
    };
  }
  componentWillUnmount() {
    this._isMounted = false;
  }
  componentDidMount() {
    this._isMounted = true;
    const stickerId = this.props.stickerDetails.imgSrc.split("?id=")[1];
    if (!stickerId) throw "Error mounting StickerDetails";
    this.setState({
      isLoading: true
    });
    const alternatives = requestionAlternatives(stickerId);
    alternatives.then(stickers => {
      if (stickers && stickers.length > 0 && this._isMounted) {
        this.alternatives.push(...stickers);
        // console.log('alternatives: ', this.alternatives);
        // Index for sticker alternatives
        this.aIndex = 0;
        this.setState({
          isAlternatives: true,
          isLoading: false
        });
      } else if (this._isMounted) {
        this.setState({
          isLoading: false
        });
      }
    });
  }
  nativeShare = () => {
    console.log("nativeShare is called");
    this.sticker.current.onShare();
  };
  igShare = () => {
    console.log("igShare is called");
    this.sticker.current.onShare("ig");
  };
  alternate = () => {
    // console.log('starting to alternate');
    this.setState(
      {
        image: false
      },
      () => {
        if (this.aIndex + 1 >= this.alternatives.length) {
          this.aIndex = 0;
          var a = this.alternatives[this.aIndex];
        } else {
          this.aIndex = this.aIndex + 1;
          var a = this.alternatives[this.aIndex];
        }
        // console.log(a);
        this.setState({
          image: true,
          base64: "",
          imgSrc: a.imgSrc,
          imgHeight: a.imgHeight,
          imgWidth: a.imgWidth
        });
      }
    );
  };
  renderSticker = () => (
    <View>
      {this.state.image && (
        <Sticker
          ref={this.sticker}
          imgSrc={this.state.imgSrc}
          imgHeight={this.state.imgHeight}
          imgWidth={this.state.imgWidth}
          base64={this.state.base64}
        />
      )}
    </View>
  );
  renderAlternate = () => (
    <View>
      {this.state.isAlternatives && (
        <TouchableOpacity onPress={this.alternate}>
          <Image
            source={require("../../assets/alternate.png")}
            fadeDuration={0}
            style={{ width: 30, height: 30 }}
          />
        </TouchableOpacity>
      )}
    </View>
  );
  openWeb = async () => {
    try {
      let result = await WebBrowser.openBrowserAsync(
        this.props.stickerDetails.redirectUrl
      );
      console.log(result);
      WebBrowser.dismissBrowser();
    } catch (e) {
      console.log(e);
    }
  };
  renderLoading = () => (
    <View>
      {this.state.isLoading && (
        <ActivityIndicator animating={this.state.isLoading} />
      )}
    </View>
  );
  renderOpen = () =>
    this.props.stickerDetails.redirectUrl && (
      <View>
        <TouchableOpacity
          onPress={() => this.openWeb()}
          style={{
            borderRadius: 10,
            alignItems: "center",
            backgroundColor: "transparent",
            borderColor: "#b3b6c3",
            borderWidth: 1,
            maxHeight: 40,
            maxWidth: 100,
            padding: 8
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontFamily: "roboto-light",
              color: "#b3b6c3"
            }}
          >
            Open Page
          </Text>
        </TouchableOpacity>
      </View>
    );
  renderBack = () => (
    <View>
      <TouchableOpacity onPress={this.props.backToSerp}>
        <Icon
          name="arrow-back"
          type="MaterialIcons"
          size={30}
          color="#b3b6c3"
        />
      </TouchableOpacity>
    </View>
  );
  renderShare = () => (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        marginTop: 100,
        bottom: controllBottom
      }}
    >
      <View style={{ flex: 1, flexDirection: "row", justifyContent: "center" }}>
        <TouchableOpacity
          style={{
            borderRadius: 10,
            alignContent: "center",
            backgroundColor: "#fffc00",
            borderColor: "#fffc00",
            borderWidth: 1,
            maxHeight: 40,
            maxWidth: 180,
            padding: 10,
            margin: 20
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "center" }}>
            <Image
              source={require("../../assets/iconfinder_snapchat_2136492.png")}
              fadeDuration={0}
              style={{ width: 20, height: 20 }}
            />
            <Text style={{ fontFamily: "roboto", fontSize: 14, margin: 2 }}>
              Share
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={this.igShare}
          style={{
            borderRadius: 10,
            marginLeft: 5,
            backgroundColor: "transparent",
            borderColor: "#fff",
            borderWidth: 1,
            maxHeight: 40,
            maxWidth: 140,
            padding: 10,
            margin: 20
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center"
            }}
          >
            <Icon
              name="logo-instagram"
              type="Ionicons"
              size={20}
              color="#FFFFFF"
            />
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={this.nativeShare}
          style={{
            borderRadius: 10,
            marginLeft: 5,
            backgroundColor: "transparent",
            borderColor: "#fff",
            borderWidth: 1,
            maxHeight: 40,
            maxWidth: 140,
            padding: 10,
            margin: 20
          }}
        >
          <Icon
            name="ios-share-alt"
            type="Ionicons"
            size={20}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
  render() {
    return (
      <View style={{ marginTop: 100 }}>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            marginTop: 10
          }}
        >
          {this.renderSticker()}
        </View>
        <View style={{ flex: 1 }}>
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              justifyContent: "space-evenly",
              alignItems: "center"
            }}
          >
            <View style={{ flex: 1 }}>{this.renderBack()}</View>
            <View style={{ flex: 1 }}>{this.renderOpen()}</View>
            <View style={{ flex: 1 }}>
              {this.renderAlternate()}
              {this.renderLoading()}
            </View>
          </View>
        </View>
        {this.renderShare()}
      </View>
    );
  }
}
const styles = {
  innerContainer: {
    flex: 1,
    alignItems: "center",
    flexDirection: "column",
    alignContent: "center",
    alignSelf: "flex-start",
    justifyContent: "center"
  },
  container: {
    ...Platform.select({
      android: {
        top: 24
      }
    }),
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    alignItems: "center",
    backgroundColor: "#21283d"
  }
};
