import React, { Component } from "react";
import {
  View,
  Platform,
  FlatList,
  StatusBar,
  SafeAreaView
} from "react-native";
import SearchBar from "react-native-dynamic-search-bar";
import Sticker from "./components/Sticker";

import stickerData from "./data/stickerData";

export default class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      query: "",
      dataSource: stickerData,
      isLoading: false
    };
  }

  setQuery = text => {
    this.setState({
      query: text,
      dataSource: stickerData
    });
  };

  renderItem = item => {
    return (
      <Sticker
        imgSrc={item.image}
        imgHeight={item.height}
        imgWidth={item.width}
      />
    );
  };

  endReached() {
    // Placeholder for Analytics
  }

  render() {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#21283d" }}>
        <StatusBar barStyle={"light-content"} />
        <View style={styles.container}>
          <SearchBar
            autoFocus={true}
            fontColor="#c6c6c6"
            iconColor="#c6c6c6"
            shadowColor="#282828"
            cancelIconColor="#c6c6c6"
            backgroundColor="#353d5e"
            placeholder="Search for fact stickers"
            onChangeText={text => {
              this.setQuery(text);
            }}
            onPressCancel={() => {
              this.setQuery("");
            }}
          />
          <View style={{ top: 12 }}>
            <FlatList
              data={this.state.dataSource}
              renderItem={({ item }) => this.renderItem(item)}
              keyExtractor={(item, index) => index.toString()}
              onEndReached={this.endReached}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }
}

const styles = {
  container: {
    ...Platform.select({
      android: {
        top: 24
      }
    }),
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#21283d"
  }
};
