// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'user_entity.dart';

// **************************************************************************
// IsarCollectionGenerator
// **************************************************************************

// coverage:ignore-file
// ignore_for_file: duplicate_ignore, non_constant_identifier_names, constant_identifier_names, invalid_use_of_protected_member, unnecessary_cast, prefer_const_constructors, lines_longer_than_80_chars, require_trailing_commas, inference_failure_on_function_invocation, unnecessary_parenthesis, unnecessary_raw_strings, unnecessary_null_checks, join_return_with_assignment, prefer_final_locals, avoid_js_rounded_ints, avoid_positional_boolean_parameters, always_specify_types

extension GetUserEntityCollection on Isar {
  IsarCollection<UserEntity> get userEntitys => this.collection();
}

const UserEntitySchema = CollectionSchema(
  name: r'User',
  id: -7838171048429979076,
  properties: {
    r'authProvider': PropertySchema(
      id: 0,
      name: r'authProvider',
      type: IsarType.byte,
      enumMap: _UserEntityauthProviderEnumValueMap,
    ),
    r'createdAt': PropertySchema(
      id: 1,
      name: r'createdAt',
      type: IsarType.dateTime,
    ),
    r'defaultFontFamily': PropertySchema(
      id: 2,
      name: r'defaultFontFamily',
      type: IsarType.string,
    ),
    r'defaultFontSize': PropertySchema(
      id: 3,
      name: r'defaultFontSize',
      type: IsarType.double,
    ),
    r'defaultSectionSize': PropertySchema(
      id: 4,
      name: r'defaultSectionSize',
      type: IsarType.long,
    ),
    r'defaultSectionType': PropertySchema(
      id: 5,
      name: r'defaultSectionType',
      type: IsarType.byte,
      enumMap: _UserEntitydefaultSectionTypeEnumValueMap,
    ),
    r'displayName': PropertySchema(
      id: 6,
      name: r'displayName',
      type: IsarType.string,
    ),
    r'email': PropertySchema(
      id: 7,
      name: r'email',
      type: IsarType.string,
    ),
    r'learningLanguage': PropertySchema(
      id: 8,
      name: r'learningLanguage',
      type: IsarType.string,
    ),
    r'nativeLanguage': PropertySchema(
      id: 9,
      name: r'nativeLanguage',
      type: IsarType.string,
    ),
    r'photoUrl': PropertySchema(
      id: 10,
      name: r'photoUrl',
      type: IsarType.string,
    ),
    r'themeMode': PropertySchema(
      id: 11,
      name: r'themeMode',
      type: IsarType.byte,
      enumMap: _UserEntitythemeModeEnumValueMap,
    ),
    r'updatedAt': PropertySchema(
      id: 12,
      name: r'updatedAt',
      type: IsarType.dateTime,
    ),
    r'userId': PropertySchema(
      id: 13,
      name: r'userId',
      type: IsarType.string,
    ),
    r'vocabularyThreshold': PropertySchema(
      id: 14,
      name: r'vocabularyThreshold',
      type: IsarType.double,
    )
  },
  estimateSize: _userEntityEstimateSize,
  serialize: _userEntitySerialize,
  deserialize: _userEntityDeserialize,
  deserializeProp: _userEntityDeserializeProp,
  idName: r'id',
  indexes: {
    r'userId': IndexSchema(
      id: -2005826577402374815,
      name: r'userId',
      unique: true,
      replace: false,
      properties: [
        IndexPropertySchema(
          name: r'userId',
          type: IndexType.hash,
          caseSensitive: true,
        )
      ],
    )
  },
  links: {},
  embeddedSchemas: {},
  getId: _userEntityGetId,
  getLinks: _userEntityGetLinks,
  attach: _userEntityAttach,
  version: '3.1.0+1',
);

int _userEntityEstimateSize(
  UserEntity object,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  var bytesCount = offsets.last;
  bytesCount += 3 + object.defaultFontFamily.length * 3;
  {
    final value = object.displayName;
    if (value != null) {
      bytesCount += 3 + value.length * 3;
    }
  }
  bytesCount += 3 + object.email.length * 3;
  {
    final value = object.learningLanguage;
    if (value != null) {
      bytesCount += 3 + value.length * 3;
    }
  }
  {
    final value = object.nativeLanguage;
    if (value != null) {
      bytesCount += 3 + value.length * 3;
    }
  }
  {
    final value = object.photoUrl;
    if (value != null) {
      bytesCount += 3 + value.length * 3;
    }
  }
  bytesCount += 3 + object.userId.length * 3;
  return bytesCount;
}

void _userEntitySerialize(
  UserEntity object,
  IsarWriter writer,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  writer.writeByte(offsets[0], object.authProvider.index);
  writer.writeDateTime(offsets[1], object.createdAt);
  writer.writeString(offsets[2], object.defaultFontFamily);
  writer.writeDouble(offsets[3], object.defaultFontSize);
  writer.writeLong(offsets[4], object.defaultSectionSize);
  writer.writeByte(offsets[5], object.defaultSectionType.index);
  writer.writeString(offsets[6], object.displayName);
  writer.writeString(offsets[7], object.email);
  writer.writeString(offsets[8], object.learningLanguage);
  writer.writeString(offsets[9], object.nativeLanguage);
  writer.writeString(offsets[10], object.photoUrl);
  writer.writeByte(offsets[11], object.themeMode.index);
  writer.writeDateTime(offsets[12], object.updatedAt);
  writer.writeString(offsets[13], object.userId);
  writer.writeDouble(offsets[14], object.vocabularyThreshold);
}

UserEntity _userEntityDeserialize(
  Id id,
  IsarReader reader,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  final object = UserEntity();
  object.authProvider =
      _UserEntityauthProviderValueEnumMap[reader.readByteOrNull(offsets[0])] ??
          AuthProvider.email;
  object.createdAt = reader.readDateTime(offsets[1]);
  object.defaultFontFamily = reader.readString(offsets[2]);
  object.defaultFontSize = reader.readDouble(offsets[3]);
  object.defaultSectionSize = reader.readLong(offsets[4]);
  object.defaultSectionType = _UserEntitydefaultSectionTypeValueEnumMap[
          reader.readByteOrNull(offsets[5])] ??
      SectionType.pages;
  object.displayName = reader.readStringOrNull(offsets[6]);
  object.email = reader.readString(offsets[7]);
  object.id = id;
  object.learningLanguage = reader.readStringOrNull(offsets[8]);
  object.nativeLanguage = reader.readStringOrNull(offsets[9]);
  object.photoUrl = reader.readStringOrNull(offsets[10]);
  object.themeMode =
      _UserEntitythemeModeValueEnumMap[reader.readByteOrNull(offsets[11])] ??
          AppThemeMode.light;
  object.updatedAt = reader.readDateTime(offsets[12]);
  object.userId = reader.readString(offsets[13]);
  object.vocabularyThreshold = reader.readDouble(offsets[14]);
  return object;
}

P _userEntityDeserializeProp<P>(
  IsarReader reader,
  int propertyId,
  int offset,
  Map<Type, List<int>> allOffsets,
) {
  switch (propertyId) {
    case 0:
      return (_UserEntityauthProviderValueEnumMap[
              reader.readByteOrNull(offset)] ??
          AuthProvider.email) as P;
    case 1:
      return (reader.readDateTime(offset)) as P;
    case 2:
      return (reader.readString(offset)) as P;
    case 3:
      return (reader.readDouble(offset)) as P;
    case 4:
      return (reader.readLong(offset)) as P;
    case 5:
      return (_UserEntitydefaultSectionTypeValueEnumMap[
              reader.readByteOrNull(offset)] ??
          SectionType.pages) as P;
    case 6:
      return (reader.readStringOrNull(offset)) as P;
    case 7:
      return (reader.readString(offset)) as P;
    case 8:
      return (reader.readStringOrNull(offset)) as P;
    case 9:
      return (reader.readStringOrNull(offset)) as P;
    case 10:
      return (reader.readStringOrNull(offset)) as P;
    case 11:
      return (_UserEntitythemeModeValueEnumMap[reader.readByteOrNull(offset)] ??
          AppThemeMode.light) as P;
    case 12:
      return (reader.readDateTime(offset)) as P;
    case 13:
      return (reader.readString(offset)) as P;
    case 14:
      return (reader.readDouble(offset)) as P;
    default:
      throw IsarError('Unknown property with id $propertyId');
  }
}

const _UserEntityauthProviderEnumValueMap = {
  'email': 0,
  'google': 1,
  'facebook': 2,
  'apple': 3,
};
const _UserEntityauthProviderValueEnumMap = {
  0: AuthProvider.email,
  1: AuthProvider.google,
  2: AuthProvider.facebook,
  3: AuthProvider.apple,
};
const _UserEntitydefaultSectionTypeEnumValueMap = {
  'pages': 0,
  'chapters': 1,
};
const _UserEntitydefaultSectionTypeValueEnumMap = {
  0: SectionType.pages,
  1: SectionType.chapters,
};
const _UserEntitythemeModeEnumValueMap = {
  'light': 0,
  'dark': 1,
  'system': 2,
};
const _UserEntitythemeModeValueEnumMap = {
  0: AppThemeMode.light,
  1: AppThemeMode.dark,
  2: AppThemeMode.system,
};

Id _userEntityGetId(UserEntity object) {
  return object.id;
}

List<IsarLinkBase<dynamic>> _userEntityGetLinks(UserEntity object) {
  return [];
}

void _userEntityAttach(IsarCollection<dynamic> col, Id id, UserEntity object) {
  object.id = id;
}

extension UserEntityByIndex on IsarCollection<UserEntity> {
  Future<UserEntity?> getByUserId(String userId) {
    return getByIndex(r'userId', [userId]);
  }

  UserEntity? getByUserIdSync(String userId) {
    return getByIndexSync(r'userId', [userId]);
  }

  Future<bool> deleteByUserId(String userId) {
    return deleteByIndex(r'userId', [userId]);
  }

  bool deleteByUserIdSync(String userId) {
    return deleteByIndexSync(r'userId', [userId]);
  }

  Future<List<UserEntity?>> getAllByUserId(List<String> userIdValues) {
    final values = userIdValues.map((e) => [e]).toList();
    return getAllByIndex(r'userId', values);
  }

  List<UserEntity?> getAllByUserIdSync(List<String> userIdValues) {
    final values = userIdValues.map((e) => [e]).toList();
    return getAllByIndexSync(r'userId', values);
  }

  Future<int> deleteAllByUserId(List<String> userIdValues) {
    final values = userIdValues.map((e) => [e]).toList();
    return deleteAllByIndex(r'userId', values);
  }

  int deleteAllByUserIdSync(List<String> userIdValues) {
    final values = userIdValues.map((e) => [e]).toList();
    return deleteAllByIndexSync(r'userId', values);
  }

  Future<Id> putByUserId(UserEntity object) {
    return putByIndex(r'userId', object);
  }

  Id putByUserIdSync(UserEntity object, {bool saveLinks = true}) {
    return putByIndexSync(r'userId', object, saveLinks: saveLinks);
  }

  Future<List<Id>> putAllByUserId(List<UserEntity> objects) {
    return putAllByIndex(r'userId', objects);
  }

  List<Id> putAllByUserIdSync(List<UserEntity> objects,
      {bool saveLinks = true}) {
    return putAllByIndexSync(r'userId', objects, saveLinks: saveLinks);
  }
}

extension UserEntityQueryWhereSort
    on QueryBuilder<UserEntity, UserEntity, QWhere> {
  QueryBuilder<UserEntity, UserEntity, QAfterWhere> anyId() {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(const IdWhereClause.any());
    });
  }
}

extension UserEntityQueryWhere
    on QueryBuilder<UserEntity, UserEntity, QWhereClause> {
  QueryBuilder<UserEntity, UserEntity, QAfterWhereClause> idEqualTo(Id id) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IdWhereClause.between(
        lower: id,
        upper: id,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterWhereClause> idNotEqualTo(Id id) {
    return QueryBuilder.apply(this, (query) {
      if (query.whereSort == Sort.asc) {
        return query
            .addWhereClause(
              IdWhereClause.lessThan(upper: id, includeUpper: false),
            )
            .addWhereClause(
              IdWhereClause.greaterThan(lower: id, includeLower: false),
            );
      } else {
        return query
            .addWhereClause(
              IdWhereClause.greaterThan(lower: id, includeLower: false),
            )
            .addWhereClause(
              IdWhereClause.lessThan(upper: id, includeUpper: false),
            );
      }
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterWhereClause> idGreaterThan(Id id,
      {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(
        IdWhereClause.greaterThan(lower: id, includeLower: include),
      );
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterWhereClause> idLessThan(Id id,
      {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(
        IdWhereClause.lessThan(upper: id, includeUpper: include),
      );
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterWhereClause> idBetween(
    Id lowerId,
    Id upperId, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IdWhereClause.between(
        lower: lowerId,
        includeLower: includeLower,
        upper: upperId,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterWhereClause> userIdEqualTo(
      String userId) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IndexWhereClause.equalTo(
        indexName: r'userId',
        value: [userId],
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterWhereClause> userIdNotEqualTo(
      String userId) {
    return QueryBuilder.apply(this, (query) {
      if (query.whereSort == Sort.asc) {
        return query
            .addWhereClause(IndexWhereClause.between(
              indexName: r'userId',
              lower: [],
              upper: [userId],
              includeUpper: false,
            ))
            .addWhereClause(IndexWhereClause.between(
              indexName: r'userId',
              lower: [userId],
              includeLower: false,
              upper: [],
            ));
      } else {
        return query
            .addWhereClause(IndexWhereClause.between(
              indexName: r'userId',
              lower: [userId],
              includeLower: false,
              upper: [],
            ))
            .addWhereClause(IndexWhereClause.between(
              indexName: r'userId',
              lower: [],
              upper: [userId],
              includeUpper: false,
            ));
      }
    });
  }
}

extension UserEntityQueryFilter
    on QueryBuilder<UserEntity, UserEntity, QFilterCondition> {
  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      authProviderEqualTo(AuthProvider value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'authProvider',
        value: value,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      authProviderGreaterThan(
    AuthProvider value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'authProvider',
        value: value,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      authProviderLessThan(
    AuthProvider value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'authProvider',
        value: value,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      authProviderBetween(
    AuthProvider lower,
    AuthProvider upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'authProvider',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition> createdAtEqualTo(
      DateTime value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'createdAt',
        value: value,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      createdAtGreaterThan(
    DateTime value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'createdAt',
        value: value,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition> createdAtLessThan(
    DateTime value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'createdAt',
        value: value,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition> createdAtBetween(
    DateTime lower,
    DateTime upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'createdAt',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      defaultFontFamilyEqualTo(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'defaultFontFamily',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      defaultFontFamilyGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'defaultFontFamily',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      defaultFontFamilyLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'defaultFontFamily',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      defaultFontFamilyBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'defaultFontFamily',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      defaultFontFamilyStartsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.startsWith(
        property: r'defaultFontFamily',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      defaultFontFamilyEndsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.endsWith(
        property: r'defaultFontFamily',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      defaultFontFamilyContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'defaultFontFamily',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      defaultFontFamilyMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'defaultFontFamily',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      defaultFontFamilyIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'defaultFontFamily',
        value: '',
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      defaultFontFamilyIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'defaultFontFamily',
        value: '',
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      defaultFontSizeEqualTo(
    double value, {
    double epsilon = Query.epsilon,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'defaultFontSize',
        value: value,
        epsilon: epsilon,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      defaultFontSizeGreaterThan(
    double value, {
    bool include = false,
    double epsilon = Query.epsilon,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'defaultFontSize',
        value: value,
        epsilon: epsilon,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      defaultFontSizeLessThan(
    double value, {
    bool include = false,
    double epsilon = Query.epsilon,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'defaultFontSize',
        value: value,
        epsilon: epsilon,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      defaultFontSizeBetween(
    double lower,
    double upper, {
    bool includeLower = true,
    bool includeUpper = true,
    double epsilon = Query.epsilon,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'defaultFontSize',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        epsilon: epsilon,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      defaultSectionSizeEqualTo(int value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'defaultSectionSize',
        value: value,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      defaultSectionSizeGreaterThan(
    int value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'defaultSectionSize',
        value: value,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      defaultSectionSizeLessThan(
    int value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'defaultSectionSize',
        value: value,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      defaultSectionSizeBetween(
    int lower,
    int upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'defaultSectionSize',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      defaultSectionTypeEqualTo(SectionType value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'defaultSectionType',
        value: value,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      defaultSectionTypeGreaterThan(
    SectionType value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'defaultSectionType',
        value: value,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      defaultSectionTypeLessThan(
    SectionType value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'defaultSectionType',
        value: value,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      defaultSectionTypeBetween(
    SectionType lower,
    SectionType upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'defaultSectionType',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      displayNameIsNull() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(const FilterCondition.isNull(
        property: r'displayName',
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      displayNameIsNotNull() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(const FilterCondition.isNotNull(
        property: r'displayName',
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      displayNameEqualTo(
    String? value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'displayName',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      displayNameGreaterThan(
    String? value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'displayName',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      displayNameLessThan(
    String? value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'displayName',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      displayNameBetween(
    String? lower,
    String? upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'displayName',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      displayNameStartsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.startsWith(
        property: r'displayName',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      displayNameEndsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.endsWith(
        property: r'displayName',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      displayNameContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'displayName',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      displayNameMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'displayName',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      displayNameIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'displayName',
        value: '',
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      displayNameIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'displayName',
        value: '',
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition> emailEqualTo(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'email',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition> emailGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'email',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition> emailLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'email',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition> emailBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'email',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition> emailStartsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.startsWith(
        property: r'email',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition> emailEndsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.endsWith(
        property: r'email',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition> emailContains(
      String value,
      {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'email',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition> emailMatches(
      String pattern,
      {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'email',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition> emailIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'email',
        value: '',
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      emailIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'email',
        value: '',
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition> idEqualTo(
      Id value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'id',
        value: value,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition> idGreaterThan(
    Id value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'id',
        value: value,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition> idLessThan(
    Id value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'id',
        value: value,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition> idBetween(
    Id lower,
    Id upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'id',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      learningLanguageIsNull() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(const FilterCondition.isNull(
        property: r'learningLanguage',
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      learningLanguageIsNotNull() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(const FilterCondition.isNotNull(
        property: r'learningLanguage',
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      learningLanguageEqualTo(
    String? value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'learningLanguage',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      learningLanguageGreaterThan(
    String? value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'learningLanguage',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      learningLanguageLessThan(
    String? value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'learningLanguage',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      learningLanguageBetween(
    String? lower,
    String? upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'learningLanguage',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      learningLanguageStartsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.startsWith(
        property: r'learningLanguage',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      learningLanguageEndsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.endsWith(
        property: r'learningLanguage',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      learningLanguageContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'learningLanguage',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      learningLanguageMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'learningLanguage',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      learningLanguageIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'learningLanguage',
        value: '',
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      learningLanguageIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'learningLanguage',
        value: '',
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      nativeLanguageIsNull() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(const FilterCondition.isNull(
        property: r'nativeLanguage',
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      nativeLanguageIsNotNull() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(const FilterCondition.isNotNull(
        property: r'nativeLanguage',
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      nativeLanguageEqualTo(
    String? value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'nativeLanguage',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      nativeLanguageGreaterThan(
    String? value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'nativeLanguage',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      nativeLanguageLessThan(
    String? value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'nativeLanguage',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      nativeLanguageBetween(
    String? lower,
    String? upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'nativeLanguage',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      nativeLanguageStartsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.startsWith(
        property: r'nativeLanguage',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      nativeLanguageEndsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.endsWith(
        property: r'nativeLanguage',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      nativeLanguageContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'nativeLanguage',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      nativeLanguageMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'nativeLanguage',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      nativeLanguageIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'nativeLanguage',
        value: '',
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      nativeLanguageIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'nativeLanguage',
        value: '',
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition> photoUrlIsNull() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(const FilterCondition.isNull(
        property: r'photoUrl',
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      photoUrlIsNotNull() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(const FilterCondition.isNotNull(
        property: r'photoUrl',
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition> photoUrlEqualTo(
    String? value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'photoUrl',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      photoUrlGreaterThan(
    String? value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'photoUrl',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition> photoUrlLessThan(
    String? value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'photoUrl',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition> photoUrlBetween(
    String? lower,
    String? upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'photoUrl',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      photoUrlStartsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.startsWith(
        property: r'photoUrl',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition> photoUrlEndsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.endsWith(
        property: r'photoUrl',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition> photoUrlContains(
      String value,
      {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'photoUrl',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition> photoUrlMatches(
      String pattern,
      {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'photoUrl',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      photoUrlIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'photoUrl',
        value: '',
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      photoUrlIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'photoUrl',
        value: '',
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition> themeModeEqualTo(
      AppThemeMode value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'themeMode',
        value: value,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      themeModeGreaterThan(
    AppThemeMode value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'themeMode',
        value: value,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition> themeModeLessThan(
    AppThemeMode value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'themeMode',
        value: value,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition> themeModeBetween(
    AppThemeMode lower,
    AppThemeMode upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'themeMode',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition> updatedAtEqualTo(
      DateTime value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'updatedAt',
        value: value,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      updatedAtGreaterThan(
    DateTime value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'updatedAt',
        value: value,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition> updatedAtLessThan(
    DateTime value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'updatedAt',
        value: value,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition> updatedAtBetween(
    DateTime lower,
    DateTime upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'updatedAt',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition> userIdEqualTo(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'userId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition> userIdGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'userId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition> userIdLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'userId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition> userIdBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'userId',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition> userIdStartsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.startsWith(
        property: r'userId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition> userIdEndsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.endsWith(
        property: r'userId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition> userIdContains(
      String value,
      {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'userId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition> userIdMatches(
      String pattern,
      {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'userId',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition> userIdIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'userId',
        value: '',
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      userIdIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'userId',
        value: '',
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      vocabularyThresholdEqualTo(
    double value, {
    double epsilon = Query.epsilon,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'vocabularyThreshold',
        value: value,
        epsilon: epsilon,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      vocabularyThresholdGreaterThan(
    double value, {
    bool include = false,
    double epsilon = Query.epsilon,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'vocabularyThreshold',
        value: value,
        epsilon: epsilon,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      vocabularyThresholdLessThan(
    double value, {
    bool include = false,
    double epsilon = Query.epsilon,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'vocabularyThreshold',
        value: value,
        epsilon: epsilon,
      ));
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterFilterCondition>
      vocabularyThresholdBetween(
    double lower,
    double upper, {
    bool includeLower = true,
    bool includeUpper = true,
    double epsilon = Query.epsilon,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'vocabularyThreshold',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        epsilon: epsilon,
      ));
    });
  }
}

extension UserEntityQueryObject
    on QueryBuilder<UserEntity, UserEntity, QFilterCondition> {}

extension UserEntityQueryLinks
    on QueryBuilder<UserEntity, UserEntity, QFilterCondition> {}

extension UserEntityQuerySortBy
    on QueryBuilder<UserEntity, UserEntity, QSortBy> {
  QueryBuilder<UserEntity, UserEntity, QAfterSortBy> sortByAuthProvider() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'authProvider', Sort.asc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy> sortByAuthProviderDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'authProvider', Sort.desc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy> sortByCreatedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'createdAt', Sort.asc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy> sortByCreatedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'createdAt', Sort.desc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy> sortByDefaultFontFamily() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'defaultFontFamily', Sort.asc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy>
      sortByDefaultFontFamilyDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'defaultFontFamily', Sort.desc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy> sortByDefaultFontSize() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'defaultFontSize', Sort.asc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy>
      sortByDefaultFontSizeDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'defaultFontSize', Sort.desc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy>
      sortByDefaultSectionSize() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'defaultSectionSize', Sort.asc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy>
      sortByDefaultSectionSizeDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'defaultSectionSize', Sort.desc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy>
      sortByDefaultSectionType() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'defaultSectionType', Sort.asc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy>
      sortByDefaultSectionTypeDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'defaultSectionType', Sort.desc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy> sortByDisplayName() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'displayName', Sort.asc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy> sortByDisplayNameDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'displayName', Sort.desc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy> sortByEmail() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'email', Sort.asc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy> sortByEmailDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'email', Sort.desc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy> sortByLearningLanguage() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'learningLanguage', Sort.asc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy>
      sortByLearningLanguageDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'learningLanguage', Sort.desc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy> sortByNativeLanguage() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'nativeLanguage', Sort.asc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy>
      sortByNativeLanguageDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'nativeLanguage', Sort.desc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy> sortByPhotoUrl() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'photoUrl', Sort.asc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy> sortByPhotoUrlDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'photoUrl', Sort.desc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy> sortByThemeMode() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'themeMode', Sort.asc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy> sortByThemeModeDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'themeMode', Sort.desc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy> sortByUpdatedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'updatedAt', Sort.asc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy> sortByUpdatedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'updatedAt', Sort.desc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy> sortByUserId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'userId', Sort.asc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy> sortByUserIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'userId', Sort.desc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy>
      sortByVocabularyThreshold() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'vocabularyThreshold', Sort.asc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy>
      sortByVocabularyThresholdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'vocabularyThreshold', Sort.desc);
    });
  }
}

extension UserEntityQuerySortThenBy
    on QueryBuilder<UserEntity, UserEntity, QSortThenBy> {
  QueryBuilder<UserEntity, UserEntity, QAfterSortBy> thenByAuthProvider() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'authProvider', Sort.asc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy> thenByAuthProviderDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'authProvider', Sort.desc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy> thenByCreatedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'createdAt', Sort.asc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy> thenByCreatedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'createdAt', Sort.desc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy> thenByDefaultFontFamily() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'defaultFontFamily', Sort.asc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy>
      thenByDefaultFontFamilyDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'defaultFontFamily', Sort.desc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy> thenByDefaultFontSize() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'defaultFontSize', Sort.asc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy>
      thenByDefaultFontSizeDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'defaultFontSize', Sort.desc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy>
      thenByDefaultSectionSize() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'defaultSectionSize', Sort.asc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy>
      thenByDefaultSectionSizeDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'defaultSectionSize', Sort.desc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy>
      thenByDefaultSectionType() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'defaultSectionType', Sort.asc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy>
      thenByDefaultSectionTypeDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'defaultSectionType', Sort.desc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy> thenByDisplayName() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'displayName', Sort.asc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy> thenByDisplayNameDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'displayName', Sort.desc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy> thenByEmail() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'email', Sort.asc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy> thenByEmailDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'email', Sort.desc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy> thenById() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'id', Sort.asc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy> thenByIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'id', Sort.desc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy> thenByLearningLanguage() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'learningLanguage', Sort.asc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy>
      thenByLearningLanguageDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'learningLanguage', Sort.desc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy> thenByNativeLanguage() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'nativeLanguage', Sort.asc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy>
      thenByNativeLanguageDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'nativeLanguage', Sort.desc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy> thenByPhotoUrl() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'photoUrl', Sort.asc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy> thenByPhotoUrlDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'photoUrl', Sort.desc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy> thenByThemeMode() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'themeMode', Sort.asc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy> thenByThemeModeDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'themeMode', Sort.desc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy> thenByUpdatedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'updatedAt', Sort.asc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy> thenByUpdatedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'updatedAt', Sort.desc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy> thenByUserId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'userId', Sort.asc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy> thenByUserIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'userId', Sort.desc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy>
      thenByVocabularyThreshold() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'vocabularyThreshold', Sort.asc);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QAfterSortBy>
      thenByVocabularyThresholdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'vocabularyThreshold', Sort.desc);
    });
  }
}

extension UserEntityQueryWhereDistinct
    on QueryBuilder<UserEntity, UserEntity, QDistinct> {
  QueryBuilder<UserEntity, UserEntity, QDistinct> distinctByAuthProvider() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'authProvider');
    });
  }

  QueryBuilder<UserEntity, UserEntity, QDistinct> distinctByCreatedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'createdAt');
    });
  }

  QueryBuilder<UserEntity, UserEntity, QDistinct> distinctByDefaultFontFamily(
      {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'defaultFontFamily',
          caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QDistinct> distinctByDefaultFontSize() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'defaultFontSize');
    });
  }

  QueryBuilder<UserEntity, UserEntity, QDistinct>
      distinctByDefaultSectionSize() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'defaultSectionSize');
    });
  }

  QueryBuilder<UserEntity, UserEntity, QDistinct>
      distinctByDefaultSectionType() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'defaultSectionType');
    });
  }

  QueryBuilder<UserEntity, UserEntity, QDistinct> distinctByDisplayName(
      {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'displayName', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QDistinct> distinctByEmail(
      {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'email', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QDistinct> distinctByLearningLanguage(
      {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'learningLanguage',
          caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QDistinct> distinctByNativeLanguage(
      {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'nativeLanguage',
          caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QDistinct> distinctByPhotoUrl(
      {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'photoUrl', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QDistinct> distinctByThemeMode() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'themeMode');
    });
  }

  QueryBuilder<UserEntity, UserEntity, QDistinct> distinctByUpdatedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'updatedAt');
    });
  }

  QueryBuilder<UserEntity, UserEntity, QDistinct> distinctByUserId(
      {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'userId', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<UserEntity, UserEntity, QDistinct>
      distinctByVocabularyThreshold() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'vocabularyThreshold');
    });
  }
}

extension UserEntityQueryProperty
    on QueryBuilder<UserEntity, UserEntity, QQueryProperty> {
  QueryBuilder<UserEntity, int, QQueryOperations> idProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'id');
    });
  }

  QueryBuilder<UserEntity, AuthProvider, QQueryOperations>
      authProviderProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'authProvider');
    });
  }

  QueryBuilder<UserEntity, DateTime, QQueryOperations> createdAtProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'createdAt');
    });
  }

  QueryBuilder<UserEntity, String, QQueryOperations>
      defaultFontFamilyProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'defaultFontFamily');
    });
  }

  QueryBuilder<UserEntity, double, QQueryOperations> defaultFontSizeProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'defaultFontSize');
    });
  }

  QueryBuilder<UserEntity, int, QQueryOperations> defaultSectionSizeProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'defaultSectionSize');
    });
  }

  QueryBuilder<UserEntity, SectionType, QQueryOperations>
      defaultSectionTypeProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'defaultSectionType');
    });
  }

  QueryBuilder<UserEntity, String?, QQueryOperations> displayNameProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'displayName');
    });
  }

  QueryBuilder<UserEntity, String, QQueryOperations> emailProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'email');
    });
  }

  QueryBuilder<UserEntity, String?, QQueryOperations>
      learningLanguageProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'learningLanguage');
    });
  }

  QueryBuilder<UserEntity, String?, QQueryOperations> nativeLanguageProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'nativeLanguage');
    });
  }

  QueryBuilder<UserEntity, String?, QQueryOperations> photoUrlProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'photoUrl');
    });
  }

  QueryBuilder<UserEntity, AppThemeMode, QQueryOperations> themeModeProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'themeMode');
    });
  }

  QueryBuilder<UserEntity, DateTime, QQueryOperations> updatedAtProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'updatedAt');
    });
  }

  QueryBuilder<UserEntity, String, QQueryOperations> userIdProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'userId');
    });
  }

  QueryBuilder<UserEntity, double, QQueryOperations>
      vocabularyThresholdProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'vocabularyThreshold');
    });
  }
}
