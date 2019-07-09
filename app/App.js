import React, { Component } from "react";
import {
  ActivityIndicator,
  View,
  InputAccessoryView,
  Platform,
  FlatList,
  Text,
  SectionList,
  Keyboard,
  StatusBar,
  SafeAreaView
} from "react-native";
import * as Font from "expo-font";
import AwesomeDebouncePromise from "awesome-debounce-promise";
import SearchBar from "./components/react-native-dynamic-search-bar";
import Sticker from "./components/Sticker";
import StickerDetails from "./components/StickerDetails";
const _ = require("lodash");

const requestionFeatured = () =>
  fetch("https://requestion.app/featured")
    .then(response => {
      if (!response.ok) {
        return [];
      }
      return response.json();
    })
    .then(stickers => {
      return stickers;
    })
    .catch(error => {
      console.error(error);
      return [];
    });

const requestionQuery = query =>
  fetch("https://requestion.app/query?q=" + encodeURIComponent(query))
    .then(response => {
      if (!response.ok) {
        return [];
      }
      return response.json();
    })
    .then(responseJson => {
      return responseJson.sections;
    })
    .catch(error => {
      console.error(error);
      return [];
    });

// 1 second pause before fetching new data based on user search query changes.
const queryDebounced = AwesomeDebouncePromise(requestionQuery, 500);

export default class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      query: "",
      sections: {},
      isLoading: false,
      fontLoaded: false
    };
  }

  async componentDidMount() {
    await Font.loadAsync({
      roboto: require("./assets/fonts/Roboto-Black.ttf")
    });
    await Font.loadAsync({
      "roboto-light": require("./assets/fonts/Roboto-Light.ttf")
    });
    const featured = await requestionFeatured();
    console.log(featured);
    //_.map(featured, item => Image.prefetch(item.imgSrc));
    this.setState({ fontLoaded: true, featured: featured });
  }

  setQuery = async text => {
    this.setState({
      sections: {},
      query: text,
      isLoading: true
    });
    const sections = await queryDebounced(text);
    if (this.state.query == text) {
      this.setState({ sections: sections, isLoading: false });
      Keyboard.dismiss();
    } else {
      this.setState({
        sections: {},
        isLoading: false
      });
    }
  };

  // item is a combination of Sticker props as well as Sticker's inner state.
  openDetails = item => {
    if (item.query) {
      this.setQuery(item.query);
      Keyboard.dismiss();
    } else {
      this.setState({ stickerDetails: item, isDetailsPage: true });
    }
  };

  renderItem = item => {
    return (
      <Sticker
        imgSrc={item.imgSrc}
        imgHeight={item.imgHeight}
        imgWidth={item.imgWidth}
        query={item.query}
        redirectUrl={item.redirectUrl}
        openDetails={this.openDetails}
      />
    );
  };

  backToSerp = () => {
    this.setState({ stickerDetails: {}, isDetailsPage: false });
  };

  renderSection = section => {
    return (
      <FlatList
        initialNumToRender={2}
        // minimumViewTime={100}
        data={section.data}
        horizontal={true}
        renderItem={({ item }) => this.renderItem(item)}
        keyExtractor={(item, index) => index.toString()}
      />
    );
  };

  render() {
    const inputAccessoryViewID = "requestionSearch";
    const placeholder = "Search for fact stickers";
    return (
      this.state.fontLoaded && <SafeAreaView style={{ flex: 1, backgroundColor: "#21283d" }}>
        <StatusBar barStyle={"light-content"} />
        <View style={styles.container}>
          <SearchBar
            autoFocus={true}
            ref={search => (this.search = search)}
            fontColor="#c6c6c6"
            iconColor="#c6c6c6"
            shadowColor="#282828"
            cancelIconColor="#c6c6c6"
            backgroundColor="#353d5e"
            showCancel={this.state.query ? true : false}
            placeholder={this.state.query ? this.state.query : placeholder}
            onChangeText={text => {
              this.setQuery(text);
            }}
            onPressCancel={text => {
              this.setState({
                sections: {},
                isDetailsPage: false,
                query: text
              });
              this.search.textInput.focus();
            }}
          />
          <View style={{ top: 16 }}>
            {this.state.isLoading && !this.state.isDetailsPage && (
              <ActivityIndicator animating={this.state.isLoading} />
            )}
            {this.state.isDetailsPage && (
              <StickerDetails
                backToSerp={this.backToSerp}
                stickerDetails={this.state.stickerDetails}
              />
            )}
            {!this.state.isDetailsPage && (
              <SectionList
                renderItem={({ item, index, section }) =>
                  !index && this.renderSection(section)
                }
                renderSectionHeader={({ section: { title } }) =>
                  title ? (
                    <Text
                      style={{
                        margin: 16,
                        fontFamily: "roboto",
                        fontSize: 18,
                        color: "white",
                        fontWeight: "bold"
                      }}
                    >
                      {title}
                    </Text>
                  ) : null
                }
                sections={[
                  {
                    title: "",
                    data: _.map(
                      _.filter(
                        this.state.featured,
                        sticker => sticker.query == this.state.query
                      ),
                      o => _.omit(o, "query")
                    )
                  },
                  ...Object.values(this.state.sections)
                ]}
                keyExtractor={(item, index) => item + index}
                stickySectionHeadersEnabled={false}
                ListFooterComponent={() => (
                  <Text
                    style={{ margin: 50, fontFamily: "roboto", fontSize: 25 }}
                  >
                    {" "}
                  </Text>
                )}
              />
            )}
          </View>
          <InputAccessoryView nativeID={inputAccessoryViewID}>
            <View>
              {this.state.fontLoaded && (
                <Text
                  style={{
                    fontFamily: "roboto",
                    fontSize: 20,
                    margin: 16,
                    color: "white"
                  }}
                >
                  Featured Topics
                </Text>
              )}
              <FlatList
                keyboardShouldPersistTaps={"handled"}
                data={this.state.featured}
                horizontal={true}
                renderItem={({ item }) => this.renderItem(item)}
                keyExtractor={(item, index) => index.toString()}
                style={{ marginBottom: 20 }}
              />
            </View>
          </InputAccessoryView>
        </View>
      </SafeAreaView>
    );
  }
}

const styles = {
  container: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    backgroundColor: "#21283d"
  }
};
